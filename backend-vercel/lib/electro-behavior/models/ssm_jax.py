# models/ssm_jax.py
from dataclasses import dataclass
from typing import Tuple, Optional
import jax
import jax.numpy as jnp
from jax import lax

Key = jax.random.PRNGKey

@dataclass
class SSMParams:
    A: jnp.ndarray  # (nx, nx)
    B: jnp.ndarray  # (nx, nu)
    C: jnp.ndarray  # (ny, nx)
    D: jnp.ndarray  # (ny, nu)
    Q: jnp.ndarray  # (nx, nx) process noise cov
    R: jnp.ndarray  # (ny, ny) obs noise cov
    mu0: jnp.ndarray      # (nx,)
    Sigma0: jnp.ndarray   # (nx, nx)

def _kf_step(params: SSMParams, carry, inputs):
    mu_t, Sigma_t = carry
    y_t, u_t = inputs  # y_t:(ny,), u_t:(nu,)

    # Predict
    mu_pred = params.A @ mu_t + params.B @ u_t
    Sigma_pred = params.A @ Sigma_t @ params.A.T + params.Q

    # Update
    S = params.C @ Sigma_pred @ params.C.T + params.R
    K = jnp.linalg.solve(S, params.C @ Sigma_pred).T  # (nx, ny)
    innov = y_t - (params.C @ mu_pred + params.D @ u_t)
    mu_filt = mu_pred + K @ innov
    Sigma_filt = (jnp.eye(Sigma_pred.shape[0]) - K @ params.C) @ Sigma_pred
    return (mu_filt, Sigma_filt), (mu_pred, Sigma_pred, mu_filt, Sigma_filt, K, innov)

def kalman_filter(params: SSMParams, Y: jnp.ndarray, U: jnp.ndarray):
    """Y:(T,ny), U:(T,nu) → tuples of preds/filters."""
    init = (params.mu0, params.Sigma0)
    (_, _), outs = lax.scan(lambda c, inp: _kf_step(params, c, inp), init, (Y, U))
    mu_pred, Sigma_pred, mu_filt, Sigma_filt, K, innov = outs
    return mu_pred, Sigma_pred, mu_filt, Sigma_filt, K, innov

def rts_smoother(params: SSMParams, mu_pred, Sigma_pred, mu_filt, Sigma_filt):
    """Rauch–Tung–Striebel smoothing."""
    T, nx = mu_filt.shape
    def _bwd(carry, t):
        mu_next_s, Sigma_next_s = carry
        t = t.astype(int)
        Sigma_f = Sigma_filt[t]
        Sigma_p = Sigma_pred[t+1]
        J = Sigma_f @ params.A.T @ jnp.linalg.solve(Sigma_p, jnp.eye(nx))
        mu_s = mu_filt[t] + J @ (mu_next_s - mu_pred[t+1])
        Sigma_s = Sigma_f + J @ (Sigma_next_s - Sigma_p) @ J.T
        return (mu_s, Sigma_s), (mu_s, Sigma_s, J)
    # init with last filtered
    carry0 = (mu_filt[-1], Sigma_filt[-1])
    idxs = jnp.arange(T-2, -1, -1)
    (mu0, Sigma0), outs = lax.scan(_bwd, carry0, idxs)
    mu_s_list, Sigma_s_list, J_list = outs
    mu_s = jnp.concatenate([mu_s_list[::-1], mu0[None]], axis=0)
    Sigma_s = jnp.concatenate([Sigma_s_list[::-1], Sigma0[None]], axis=0)
    return mu_s, Sigma_s, J_list[::-1]

def _least_squares(X, Y):
    # Solve min ||Y - W X||^2 → W
    return Y @ X.T @ jnp.linalg.pinv(X @ X.T + 1e-6 * jnp.eye(X.shape[0]))

def em_fit(Y: jnp.ndarray, U: jnp.ndarray, nx: int, iters: int = 20) -> SSMParams:
    """
    Simple EM for linear-Gaussian SSM with known input U.
    Initializes via least-squares; refines using smoothed stats.
    Y:(T,ny) U:(T,nu)
    """
    T, ny = Y.shape
    nu = U.shape[1]
    # Init: linear regressions
    # y_t ≈ D u_t + C x_t ; start with x_t ≈ PCA(y)
    Uy = jnp.concatenate([U.T, jnp.ones((1, T))], axis=0)
    # crude x via PCA on Y
    _, Svals, Vt = jnp.linalg.svd(Y - Y.mean(0), full_matrices=False)
    Xinit = (Y - Y.mean(0)) @ Vt[:nx].T
    C = _least_squares(Xinit.T, (Y - (Y.mean(0)))[None].transpose(2,0,1).squeeze().T).T[:ny, :nx]
    D = jnp.zeros((ny, nu))
    A = jnp.eye(nx)
    B = jnp.zeros((nx, nu))
    Q = 1e-2 * jnp.eye(nx)
    R = 1e-2 * jnp.eye(ny)
    mu0 = jnp.zeros((nx,))
    Sigma0 = jnp.eye(nx)

    params = SSMParams(A, B, C, D, Q, R, mu0, Sigma0)

    for _ in range(iters):
        # E-step: filter + smooth
        mu_pred, Sigma_pred, mu_filt, Sigma_filt, _, _ = kalman_filter(params, Y, U)
        mu_s, Sigma_s, J = rts_smoother(params, mu_pred, Sigma_pred, mu_filt, Sigma_filt)

        # Expected sufficient stats
        Ex = mu_s                           # (T,nx)
        Exx = Sigma_s + jnp.einsum('ti,tj->tij', Ex, Ex)   # (T,nx,nx)
        Exx1 = Exx[:-1]
        Ex1x = Exx[1:]

        # M-step: A,B from x_{t+1} ≈ A x_t + B u_t
        X_t = jnp.concatenate([Ex[:-1], U[:-1]], axis=1).T           # (nx+nu, T-1)
        X_next = Ex[1:].T                                             # (nx, T-1)
        W = X_next @ X_t.T @ jnp.linalg.pinv(X_t @ X_t.T + 1e-4*jnp.eye(nx+U.shape[1]))
        A = W[:, :nx]
        B = W[:, nx:]

        # C,D from y_t ≈ C x_t + D u_t
        Xy = jnp.concatenate([Ex, U], axis=1).T                       # (nx+nu, T)
        Wy = Y.T @ Xy.T @ jnp.linalg.pinv(Xy @ Xy.T + 1e-4*jnp.eye(nx+nu))
        C = Wy[:, :nx]
        D = Wy[:, nx:]

        # Q, R as residual covariances
        res_x = Ex[1:] - (Ex[:-1] @ A.T + U[:-1] @ B.T)
        res_y = Y - (Ex @ C.T + U @ D.T)
        Q = (res_x.T @ res_x) / (T-1) + 1e-6 * jnp.eye(nx)
        R = (res_y.T @ res_y) / T + 1e-6 * jnp.eye(ny)

        params = SSMParams(A, B, C, D, Q, R, mu0, Sigma0)

    return params

def simulate(params: SSMParams, x0: jnp.ndarray, U: jnp.ndarray) -> Tuple[jnp.ndarray, jnp.ndarray]:
    """Deterministic rollout (mean trajectory). U:(T,nu) → (X:(T+1,nx), Y:(T,ny))"""
    def _step(x, u):
        x_next = params.A @ x + params.B @ u
        y = params.C @ x + params.D @ u
        return x_next, (x_next, y)
    x1, outs = lax.scan(_step, x0, U)
    X_next, Y = outs
    X = jnp.vstack([x0, X_next])
    return X, Y
