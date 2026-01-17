# control/mpc_cvxpy.py
import numpy as np
import cvxpy as cp

def mpc_plan(A, B, C, D, x0, Q, R, H=7, y_ref=None, u_bounds=None,
             latency_idx=None, latency_max_ms=None,
             budget_coeff=None, budget_weekly_usd=None):
    """
    Linear MPC (convex QP):
      minimize sum_k (y_k - y_ref)^T Q (y_k - y_ref) + u_k^T R u_k
      s.t. x_{k+1} = A x_k + B u_k
           y_k = C x_k + D u_k
           guardrails: y_k[latency_idx] <= latency_max_ms
                       sum_k budget_coeff^T u_k <= budget_weekly_usd
    """
    nx, nu = B.shape
    ny = C.shape[0]

    x = cp.Variable((nx, H+1))
    u = cp.Variable((nu, H))
    y = cp.Variable((ny, H))

    Qm = Q if isinstance(Q, np.ndarray) else Q*np.eye(ny)
    Rm = R if isinstance(R, np.ndarray) else R*np.eye(nu)

    cost = 0
    constr = [x[:,0] == x0]
    for k in range(H):
        constr += [x[:,k+1] == A @ x[:,k] + B @ u[:,k]]
        constr += [y[:,k]   == C @ x[:,k] + D @ u[:,k]]
        if y_ref is not None:
            cost += cp.quad_form(y[:,k] - y_ref, Qm)
        cost += cp.quad_form(u[:,k], Rm)
        if u_bounds is not None:
            umin, umax = u_bounds
            constr += [u[:,k] >= umin, u[:,k] <= umax]
        if latency_idx is not None and latency_max_ms is not None:
            constr += [y[latency_idx, k] <= latency_max_ms]

    if budget_coeff is not None and budget_weekly_usd is not None:
        # budget_coeff: (nu,) converting u to $ per step
        spend = cp.sum([budget_coeff @ u[:,k] for k in range(H)])
        constr += [spend <= budget_weekly_usd]

    prob = cp.Problem(cp.Minimize(cost), constr)
    prob.solve(solver=cp.OSQP, eps_abs=1e-4, eps_rel=1e-4, verbose=False)
    return {
        "status": prob.status,
        "u0": (u[:,0].value if prob.status in ("optimal", "optimal_inaccurate") else None),
        "plan_u": np.array(u.value) if u.value is not None else None,
        "plan_y": np.array(y.value) if y.value is not None else None,
        "objective": prob.value
    }
