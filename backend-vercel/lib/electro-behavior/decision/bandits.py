# decision/bandits.py
from dataclasses import dataclass
import jax
import jax.numpy as jnp

@dataclass
class LinTSState:
    mu: jnp.ndarray        # (d,)
    Sigma: jnp.ndarray     # (d,d)
    alpha: float = 1.0     # exploration scale

def init_lints(d: int, prior_var: float = 10.0) -> LinTSState:
    return LinTSState(mu=jnp.zeros((d,)), Sigma=prior_var * jnp.eye(d))

def sample_theta(key, state: LinTSState):
    L = jnp.linalg.cholesky(state.Sigma + 1e-8*jnp.eye(state.Sigma.shape[0]))
    z = jax.random.normal(key, shape=state.mu.shape)
    return state.mu + state.alpha * (L @ z)

def update(state: LinTSState, x: jnp.ndarray, r: float, noise_var: float = 1.0) -> LinTSState:
    # Bayesian linear regression update
    Sigma_inv = jnp.linalg.inv(state.Sigma)
    S_new_inv = Sigma_inv + (1/noise_var) * jnp.outer(x, x)
    S_new = jnp.linalg.inv(S_new_inv)
    m_new = S_new @ (Sigma_inv @ state.mu + (1/noise_var) * x * r)
    return LinTSState(mu=m_new, Sigma=S_new, alpha=state.alpha)

def pick_action(key, ctx_matrix: jnp.ndarray, actions: jnp.ndarray, theta: jnp.ndarray):
    """
    ctx_matrix: (K,d) contexts for each action, actions: (K,), theta:(d,)
    returns best action index by sampled reward.
    """
    rewards = ctx_matrix @ theta  # (K,)
    idx = jnp.argmax(rewards)
    return idx, rewards

def enforce_guardrails(y_pred: dict, guards: dict):
    """
    y_pred: dict of KPI predictions for candidate action
    guards: e.g., {'latency_p95_max_ms':250, 'retention_d7_min':0.24, 'budget_weekly_usd':3000}
    returns (ok:bool, violations:[str])
    """
    violations = []
    if 'latency_p95_max_ms' in guards and y_pred.get('latency_p95', 0) > guards['latency_p95_max_ms']:
        violations.append('latency_p95_max_ms')
    if 'retention_d7_min' in guards and y_pred.get('retention_d7', 1.0) < guards['retention_d7_min']:
        violations.append('retention_d7_min')
    if 'budget_weekly_usd' in guards and y_pred.get('spend_usd', 0) > guards['budget_weekly_usd']:
        violations.append('budget_weekly_usd')
    return len(violations) == 0, violations
