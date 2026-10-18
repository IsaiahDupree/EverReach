# 🎛️ Control Systems & Product Optimization

**Date**: October 22, 2025  
**Source**: ChatGPT conversation insights  
**Focus**: Systems engineering approach to product development

---

## 🎯 Core Concept: Product as a Control Loop

Treat your product like an **industrial control system** with feedback loops.

```
Targets ──► [Error e(t)] ─► Controller ─► Actuators ─► Product+Users ─► Sensors ─► Metrics
                ▲                                                           │
                └─────────────────── Feedback ────────────────────────────┘
```

---

## 📐 Systems Engineering Mapping

| Control Concept | Product/Growth Analogue |
|----------------|------------------------|
| **Setpoint** | Target metric (e.g., +3pp D7 retention) |
| **Error e(t)** | Gap to target (target − measured) |
| **Controller** | Rules, bandits, or RL policy choosing variants/msgs/budgets |
| **Actuator** | Feature flag rollout %, notif frequency, price test, cache TTL |
| **Sensor** | Event tracking, RUM, traces, crash logs |
| **Disturbance** | Seasonality, ads, outages, OS updates |
| **Dead Time** | Decision→effect delay (shipping, indexing, user cycles) |
| **Stability** | No oscillating rollouts/over-notifying |

---

## 🔧 Four Components Working Together

### **1. Control Systems (Rigor)**
- **Stability**: Don't oscillate (e.g., notif spam → opt-outs → reduce → churn)
- **Latency as dead time**: High p95 latency = sluggish feedback loop
- **Gain tuning**: Start with simple P/PI controller (thresholds + gentle ramps)
- **Anti-windup**: Don't keep ramping notifications when users muted them

### **2. User Event Tracking (Observability)**
- **Turns behavior into signals**: Funnels, cohorts, stickiness, session quality
- **Identifiability**: Consistent naming (verb_object), properties (source, variant, session perf)
- **Sampling/cadence**: Too slow = sluggish loop; too fast = noisy loop
- **Smoothing**: Use EMA/Kalman + weekly cohort views for truth

### **3. App Performance (Plant Dynamics)**
- **Latency/jank add lag**: Reduces controllability
- **SLOs as hard constraints**: p95 < 250ms, crash rate < 0.5%
- **Tie perf to A/B**: Log variant_id with all perf spans
- **No variant ships** that violates SLOs

### **4. A/B Testing (System Identification)**
- **Classic A/B = step-response**: Estimates gain (how much a change moves metric) and delay (time to effect)
- **Use it to tune controller**: How aggressively to adjust paywall, copy, notifications
- **Bandits = adaptive controllers**: Faster convergence; keep guardrails for SLOs

---

## 🎮 Minimal Control Law (You Can Ship)

Let `u` = notification intensity (0–1), `y` = weekly retention, `r` = target:

```python
# PI Controller (daily update)
error = r - y_smoothed  # Use EMA over cohorts
u_next = clamp(
    u + Kp * error + Ki * sum_error,
    0, 
    u_max_per_user
)

# Guards
if p95_latency_worsened > X or complaint_rate > Y:
    halt()

# Anti-windup
if u == u_max:
    sum_error = 0  # Don't integrate when saturated
```

**Personalize**: Different Kp, u_max by segment (new vs returning, device, country)

---

## 📊 How Components Connect

### **Event Tracking → Control System**
```
Events (app_open, outreach_sent) 
  ↓
Metrics (DAU, retention, warmth/week)
  ↓
Error signal (target - actual)
  ↓
Controller adjusts (notif intensity, paywall timing)
```

### **Performance → Control System**
```
Latency spikes detected
  ↓
Guardrail breached
  ↓
Controller halts/rolls back experiment
  ↓
Restore to known-good state
```

### **A/B Tests → Controller Tuning**
```
Run experiment
  ↓
Measure: gain (Δmetric / Δinput) and delay (days to effect)
  ↓
Update controller params (Kp, Ki, u_max)
  ↓
Ship better control policy
```

---

## 🧪 Design Experiments for Controllability

### **1. Power & Horizon**
- Size for the **time constant of metric** (don't call retention after 48h)

### **2. Randomization Integrity**
- Monitor **Sample Ratio Mismatch** (SRM)
- Check pre-exposure bias

### **3. Lag-Aware KPIs**
- Define **early leading indicators** that correlate with final KPI
- Shortens loop without lying

### **4. Sequential Rules**
- Use always-valid intervals or group sequential tests
- Avoid peeking traps

### **5. Heterogeneity**
- Report ATE (average treatment effect) **and** segment-level CATEs
- Controller can route segments to different policies

---

## 🎯 Practical Control Loop for EverReach

### **Setpoints (Targets)**
```yaml
targets:
  d7_retention: 0.45  # 45%
  weekly_warmth_delta: 2.5
  notification_open_to_action: 0.30
  paywall_net_benefit: 0.15
```

### **Sensors (Events)**
```yaml
sensors:
  - app_open
  - outreach_sent
  - notification_opened
  - notification_converted
  - paywall_view
  - trial_started
```

### **Controller (Policy)**
```yaml
notification_controller:
  Kp: 0.05  # Proportional gain
  Ki: 0.01  # Integral gain
  u_max_per_user: 2  # Max 2 notif/day
  min_hours_between: 8
  
paywall_controller:
  threshold_contacts: 20
  threshold_daily_plans: 5
  net_benefit_min: 0.10
```

### **Actuators (What We Control)**
```yaml
actuators:
  - notification_send_rate
  - notification_topic_mix
  - paywall_trigger_threshold
  - feature_flag_rollout_pct
  - ui_module_ordering
```

### **Guardrails (Safety)**
```yaml
guardrails:
  max_crash_rate: 0.005  # 0.5%
  max_p95_latency_ms: 800
  max_optout_rate: 0.03  # 3%
  min_notification_open_rate: 0.15
```

---

## 🔄 Weekly Control Loop Operations

### **Monday: Review Metrics**
```python
# 30-minute ops review
metrics = {
    'TTFV_p50': 12.3,  # minutes (target: <15)
    'D7_retention': 0.42,  # (target: 0.45)
    'warmth_week': 2.1,  # (target: 2.5)
    'notif_roi': 0.28  # open→action (target: 0.30)
}

errors = {k: targets[k] - v for k, v in metrics.items()}
```

### **Tuesday: Adjust Controllers**
```python
# Update notification controller
if errors['notif_roi'] < -0.05:  # Underperforming
    policy['score_threshold'] -= 0.02  # Send to more users
    policy['topic_mix']['warmth'] += 0.1  # More warmth topics
```

### **Wednesday: Deploy Changes**
```python
# Update policy.yaml (no code deploy needed)
# Shadow test for 24h
# Monitor guardrails
```

### **Thursday: Run Experiments**
```python
# Ship new A/B test
experiment = {
    'name': 'paywall_copy_v3',
    'variants': ['A', 'B'],
    'allocation': [0.5, 0.5],
    'primary_metric': 'paywall_net_benefit',
    'guardrails': ['crash_rate', 'p95_latency']
}
```

### **Friday: Review Experiment Results**
```python
# After 1 week, check statistical significance
# Update controller params if winner found
# Document gain and delay for future tuning
```

---

## 📈 Example: Notification Intensity Control

### **Setup**
- **Target**: D7 retention = 45%
- **Current**: 42%
- **Error**: +3 percentage points needed
- **Control variable**: Notification send rate per user

### **Week 1: Baseline**
```python
u = 1.2  # avg notifs/user/day
y = 0.42  # D7 retention
error = 0.45 - 0.42 = 0.03
```

### **Week 2: PI Update**
```python
Kp = 0.05  # Proportional gain
Ki = 0.01  # Integral gain

# Update
delta_u = Kp * error + Ki * sum_error
u_new = clamp(u + delta_u, 0, 2.0)  # Max 2/day

# Result
u_new = 1.2 + (0.05 * 0.03) = 1.2015
```

### **Week 3: Monitor Guardrails**
```python
if optout_rate > 0.03:
    # Fatigue detected, reduce intensity
    u_new = max(u * 0.9, 1.0)
    sum_error = 0  # Reset integrator (anti-windup)
```

### **Week 4: Converge**
```python
# After 4 weeks
y = 0.44  # Improved
error = 0.01  # Close to target
u = 1.4  # Stabilized
```

---

## ✅ Best Practices Checklist

### **Controller Design**
- [ ] Start with simple P or PI (not full PID)
- [ ] Tune Kp conservatively (avoid oscillation)
- [ ] Add integral action only if needed (persistent error)
- [ ] Implement anti-windup for saturating actuators
- [ ] Personalize gains by user segment

### **Event Tracking**
- [ ] Consistent naming (verb_object)
- [ ] Include variant_id in all events
- [ ] Log both event_time and ingest_time
- [ ] Dedupe by event_id
- [ ] Smooth metrics (EMA, weekly cohorts)

### **Performance Monitoring**
- [ ] Set SLOs (p95 latency, crash rate)
- [ ] Tie performance to experiments (log variant_id with spans)
- [ ] No experiment ships if SLOs violated
- [ ] Monitor performance as guardrail metric

### **Experimentation**
- [ ] Pre-register metrics
- [ ] Calculate sample size/power
- [ ] Use immutable assignments
- [ ] Check SRM (Sample Ratio Mismatch)
- [ ] Monitor guardrails (crash, latency, opt-outs)
- [ ] Document gain and delay for future tuning

### **Ops Cadence**
- [ ] Weekly metric review (30 min)
- [ ] Update controller params based on errors
- [ ] Deploy policy changes (no code deploy)
- [ ] Run 1–2 experiments per week
- [ ] Document learnings in win/learn doc

---

## 🚀 Quick Start (1 Week)

### **Day 1-2: Set Up Sensors**
- Instrument core events (app_open, core_action, notification_opened)
- Export to warehouse (BigQuery/Snowflake)
- Build basic dashboard (DAU, retention, conversion)

### **Day 3-4: Define Targets & Controllers**
- Set realistic targets (D7 retention, weekly warmth, notif ROI)
- Create policy.yaml with initial params
- Deploy FastAPI service to read policy

### **Day 5: Implement First Controller**
- Notification intensity controller (PI)
- Max 2/day, min 8h apart
- Threshold-based sending

### **Day 6-7: Test & Iterate**
- Shadow mode (log decisions, don't act)
- Monitor errors and adjust Kp/Ki
- Deploy to 5% of users

---

## 📚 Key Equations

### **PI Controller**
```
u(t) = Kp · e(t) + Ki · ∫e(τ)dτ
```

### **Error Signal**
```
e(t) = target - measured
```

### **Anti-Windup**
```
if u == u_max or u == 0:
    stop integrating
```

### **Smoothing (EMA)**
```
y_smooth(t) = α · y(t) + (1-α) · y_smooth(t-1)
```

---

## 🎓 Further Reading

- **Control Theory**: "Feedback Systems" by Åström & Murray (free PDF)
- **A/B Testing**: "Trustworthy Online Controlled Experiments" by Kohavi et al.
- **Product Metrics**: "Lean Analytics" by Croll & Yoskovitz
- **Systems Thinking**: "Thinking in Systems" by Donella Meadows

---

**From ChatGPT insights - Systems engineering for product teams**
