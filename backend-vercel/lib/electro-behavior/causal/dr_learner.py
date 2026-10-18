# causal/dr_learner.py
import numpy as np
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.model_selection import train_test_split

class DRLearner:
    """
    Binary treatment {0,1}. Estimates individual uplift tau(x).
    y: outcome (e.g., purchase=1/revenue), t: treatment (e.g., promo on/off)
    """
    def __init__(self, base_outcome=None, base_propensity=None):
        self.mu0 = base_outcome or Ridge(alpha=1.0)
        self.mu1 = base_outcome or Ridge(alpha=1.0)
        self.pi  = base_propensity or LogisticRegression(max_iter=1000)
        self.tau = Ridge(alpha=1.0)

    def fit(self, X: np.ndarray, t: np.ndarray, y: np.ndarray):
        Xtr, Xte, ttr, tte, ytr, yte = train_test_split(X, t, y, test_size=0.2, random_state=42)

        # Propensity
        self.pi.fit(Xtr, ttr)
        e = np.clip(self.pi.predict_proba(X)[:,1], 1e-3, 1-1e-3)

        # Outcome models
        self.mu0.fit(X[t==0], y[t==0])
        self.mu1.fit(X[t==1], y[t==1])
        m0 = self.mu0.predict(X)
        m1 = self.mu1.predict(X)

        # DR pseudo-outcome (AIPW)
        psi = ( (t*(y - m1))/e ) - ( ((1-t)*(y - m0))/(1-e) ) + (m1 - m0)

        # Meta-learner on psi
        self.tau.fit(X, psi)
        return self

    def predict_uplift(self, X: np.ndarray) -> np.ndarray:
        return self.tau.predict(X)

    def recommend(self, X: np.ndarray, guard_min_uplift: float = 0.0):
        tau = self.predict_uplift(X)
        treat = (tau >= guard_min_uplift).astype(int)
        return treat, tau
