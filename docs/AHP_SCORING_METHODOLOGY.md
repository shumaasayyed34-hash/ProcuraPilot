# Analytic Hierarchy Process (AHP) Supplier Scoring Engine: Technical Specification & Mathematical Reference

**Document Version:** 1.0.0  
**Phase:** Phase 3 — Multi-Criteria Decision Analysis (MCDA)  
**Author / Engineering Lead:** Paramita (AHP & Risk Analytics Lead)  
**Module:** `backend/utils/ahp_engine.py` & `backend/routers/ahp.py`  
**Downstream Consumers:** Faisal (F3.4 Score Breakdown Visualizations), Shumaaila (S3.2/S3.3 Engine Pipeline)  
**Target Reference:** Technical Architecture, Pytest Verification, & Academic Formulation  

---

## 1. Executive Summary & Architecture Context

In **ProcuraPilot AI**, multi-attribute supplier selection requires evaluating qualitative and quantitative criteria that often conflict—such as price versus warranty coverage, or delivery speed versus ESG compliance. 

To transform subjective human judgments and multi-currency quotation parameters into rigorous, audit-proof supplier rankings, ProcuraPilot AI implements the **Analytic Hierarchy Process (AHP)**, originally formulated by Thomas L. Saaty (1980), coupled with **Multi-Attribute Utility Theory (MAUT)** normalization.

```
+---------------------------------------------------------------------------------------------------+
|                                      AHP Scoring Pipeline                                         |
+---------------------------------------------------------------------------------------------------+
|  1. Pairwise Judgments (1-9 Saaty Scale)       -->  Reciprocal Matrix A                           |
|  2. Consistency Verification (P3.2)            -->  λ_max, CI, RI, CR < 0.10                      |
|  3. Weight Vector Derivation                   -->  w = [w_price, w_qual, w_deliv, w_esg]         |
|  4. Multi-Attribute Quote Extraction (S3.2)    -->  Raw Metrics (Price, Days, Warranty, ESG)     |
|  5. Min-Max Utility Normalization              -->  Benefit vs. Cost Normalization in [0, 1]      |
|  6. Additive Synthesis & Ranking (P3.1)        -->  S_i = Σ w_k * u_ik (Rank 1..m)                |
|  7. Frontend API Payload                       -->  Faisal's Radar & Stacked Bar Charts (F3.4)    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Mathematical Foundations of AHP

### 2.1 The Pairwise Comparison Matrix $A$
Given $n$ criteria $\{C_1, C_2, \dots, C_n\}$, an expert decision-maker assesses the relative importance of criterion $C_i$ against $C_j$ using Saaty's 1–9 fundamental scale:

| Intensity of Importance ($a_{ij}$) | Qualitative Definition | Explanation / Context |
| :---: | :--- | :--- |
| **1** | Equal Importance | Two criteria contribute equally to the objective. |
| **3** | Moderate Importance | Experience and judgment slightly favor criterion $i$ over $j$. |
| **5** | Strong Importance | Experience and judgment strongly favor criterion $i$ over $j$. |
| **7** | Very Strong / Demonstrated | Criterion $i$ is strongly favored and demonstrated in practice. |
| **9** | Extreme Importance | Evidence favoring $i$ over $j$ is of the highest possible affirmation. |
| **2, 4, 6, 8** | Intermediate Compromises | Adjacent judgment values when compromise is needed. |
| **Reciprocals ($1/a_{ij}$)** | Inverse Comparison | If criterion $i$ has $a_{ij}$, then criterion $j$ has $a_{ji} = 1/a_{ij}$. |

The judgment matrix $A \in \mathbb{R}^{n \times n}$ satisfies three fundamental algebraic invariants:
1. **Positivity:** $a_{ij} > 0 \quad \forall i, j \in \{1, \dots, n\}$
2. **Reflexivity:** $a_{ii} = 1.0 \quad \forall i \in \{1, \dots, n\}$
3. **Reciprocity:** $a_{ji} = \frac{1}{a_{ij}} \quad \forall i, j \in \{1, \dots, n\}$

$$
A = \begin{bmatrix}
1 & a_{12} & \cdots & a_{1n} \\
\frac{1}{a_{12}} & 1 & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
\frac{1}{a_{1n}} & \frac{1}{a_{2n}} & \cdots & 1
\end{bmatrix}
$$

---

### 2.2 Derivation of Priority Weights ($w$)

#### Method A: Exact Principal Eigenvector (Perron-Frobenius Theory)
In exact theoretical AHP, the priority vector $w = [w_1, w_2, \dots, w_n]^T$ is the unique positive normalized right eigenvector corresponding to the maximum eigenvalue $\lambda_{\max}$ of $A$:

$$A w = \lambda_{\max} w, \quad \sum_{i=1}^n w_i = 1, \quad w_i > 0$$

Under the Perron-Frobenius Theorem, for any strictly positive matrix $A$, there exists a unique, real, positive maximum eigenvalue $\lambda_{\max}$, and its corresponding eigenvector contains strictly positive real components.

#### Method B: Geometric / Row-Average Approximation (Implemented in `ahp_engine.py`)
Because full eigendecomposition of continuous pairwise matrices is numerically sensitive on low-latency microservices, Saaty established the **Normalized Column-Average Approximation**, which proves to be within $1.5\%$ of the true principal eigenvector when $CR < 0.10$:

**Step 1: Column Normalization**
$$r_{ij} = \frac{a_{ij}}{\sum_{k=1}^n a_{kj}} \quad \forall i, j \in \{1, \dots, n\}$$
Notice that each column sums to unity: $\sum_{i=1}^n r_{ij} = 1$.

**Step 2: Row Averaging**
$$w_i = \frac{1}{n} \sum_{j=1}^n r_{ij} \quad \forall i \in \{1, \dots, n\}$$
Since $\sum_{i=1}^n w_i = \frac{1}{n} \sum_{j=1}^n \sum_{i=1}^n r_{ij} = \frac{1}{n} \sum_{j=1}^n 1 = 1$, the priority weights are automatically normalized.

---

### 2.3 Mathematical Validation of Consistency (P3.2)

A decision-maker's comparisons may violate transitive consistency ($A \succ B$ and $B \succ C$ but $C \succ A$). To ensure mathematical rigor, the engine validates the **Consistency Ratio (CR)** before any quotation rankings are processed.

#### Step 1: Weighted Sum Vector ($Aw$)
Multiply matrix $A$ by priority weight vector $w$:
$$(Aw)_i = \sum_{j=1}^n a_{ij} w_j \quad \forall i \in \{1, \dots, n\}$$

#### Step 2: Individual Eigenvalue Estimates ($\lambda_i$)
$$\lambda_i = \frac{(Aw)_i}{w_i} \quad \forall i \in \{1, \dots, n\}$$
*Note:* For a perfectly transitive matrix, $\lambda_1 = \lambda_2 = \cdots = \lambda_n = n$.

#### Step 3: Principal Eigenvalue Estimate ($\lambda_{\max}$)
$$\lambda_{\max} = \frac{1}{n} \sum_{i=1}^n \lambda_i$$
By mathematical theorem, for any reciprocal matrix with positive entries:
$$\lambda_{\max} \ge n$$
Equality holds if and only if $A$ is perfectly consistent ($a_{ik} = a_{ij} a_{jk}$).

#### Step 4: Consistency Index ($CI$)
The departure of $\lambda_{\max}$ from $n$ measures the random inconsistency:
$$CI = \begin{cases} 
\frac{\lambda_{\max} - n}{n - 1}, & \text{if } n > 1 \\
0.0, & \text{if } n = 1 
\end{cases}$$

#### Step 5: Random Index ($RI$)
Saaty generated 50,000 random reciprocal matrices of dimension $n$ using random scale numbers $1–9$ and calculated their mean $CI$. The empirical standard baseline is:

| Matrix Dimension ($n$) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | $\ge 10$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Random Index ($RI$)** | 0.00 | 0.00 | 0.58 | 0.90 | 1.12 | 1.24 | 1.32 | 1.41 | 1.45 | 1.49 |

#### Step 6: Consistency Ratio ($CR$) & Threshold Boundary
$$CR = \begin{cases}
\frac{CI}{RI(n)}, & \text{if } RI(n) > 0 \\
0.0, & \text{if } RI(n) = 0
\end{cases}$$

#### Mathematical Acceptance Boundary:
- **Consistent ($CR < 0.10$):** The pairwise judgments exhibit less than $10\%$ random noise. Criteria weights are mathematically valid and approved for downstream procurement scoring.
- **Inconsistent ($CR \ge 0.10$):** Judgments contain severe circular contradictions or logical fallacies. The engine aborts calculation with HTTP 400 (`Pairwise matrix is inconsistent`) and alerts the user to revise specific comparisons.

---

## 3. Supplier Utility Normalization (P3.1)

Quotation metrics across different suppliers span disparate dimensions and scales (e.g. Unit Price in ₹10,000s, Delivery Time in Days, Warranty in Months, ESG Index in [0, 100]).

The engine uses **Min-Max Utility Normalization** mapped to $[0, 1]$:

Let $x_{ik}$ denote the raw attribute value of supplier $i$ for criterion $k$.  
Let $x_{k}^{\min} = \min_{j} x_{jk}$ and $x_{k}^{\max} = \max_{j} x_{jk}$.

### 3.1 Cost Criteria (Lower is Better: `price`, `delivery_time`)
$$
u_{ik} = \begin{cases}
\frac{x_{k}^{\max} - x_{ik}}{x_{k}^{\max} - x_{k}^{\min}}, & \text{if } x_{k}^{\max} \ne x_{k}^{\min} \\
0.5, & \text{if } x_{k}^{\max} = x_{k}^{\min} \quad (\text{Tied performance}) \\
0.0, & \text{if } x_{ik} \text{ is missing/None}
\end{cases}
$$
*Property:* The supplier offering the lowest cost receives $u_{ik} = 1.0$. The supplier with the highest cost receives $u_{ik} = 0.0$.

### 3.2 Benefit Criteria (Higher is Better: `quality`, `esg`)
$$
u_{ik} = \begin{cases}
\frac{x_{ik} - x_{k}^{\min}}{x_{k}^{\max} - x_{k}^{\min}}, & \text{if } x_{k}^{\max} \ne x_{k}^{\min} \\
0.5, & \text{if } x_{k}^{\max} = x_{k}^{\min} \quad (\text{Tied performance}) \\
0.0, & \text{if } x_{ik} \text{ is missing/None}
\end{cases}
$$
*Property:* The supplier with the best quality or ESG score receives $u_{ik} = 1.0$.

### 3.3 Raw Metric Synthesizers (`build_suppliers_data`)
1. **Quality Metric:** Derived from warranty duration and third-party certifications:
   $$\text{Quality Score} = (\text{warranty\_months} \times 10) + (50 \text{ if ISO certified else } 0)$$
2. **ESG Metric:** Reflects regulatory governance, environmental compliance, and social enterprise inclusion:
   $$\text{ESG Score} = (50 \text{ if ISO certified else } 0) + (25 \text{ if MSME registered else } 0)$$

---

## 4. Multi-Attribute Utility Score Synthesis

The composite AHP score for supplier $i$ is calculated via additive synthesis:

$$S_i = \sum_{k=1}^n w_k \cdot u_{ik}$$

Where:
- $\sum_{k=1}^n w_k = 1.0, \quad w_k \ge 0$
- $0.0 \le u_{ik} \le 1.0$
- Therefore, $0.0 \le S_i \le 1.0$

### Ranking Formulation:
Suppliers are sorted in descending order of composite score:
$$\text{Rank}(i) = 1 + \left| \{ j \mid S_j > S_i \} \right|$$

---

## 5. Five Diverse Procurement Configurations (Validation Scenarios)

The test suite in [`backend/tests/test_ahp_scoring.py`](file:///c:/clone/ProcuraPilot/backend/tests/test_ahp_scoring.py) validates the engine under 5 distinct operational scenarios:

### Summary of Tested Scenarios:
| Scenario ID | Procurement Context | Priority Vector ($w$) | Consistency Ratio ($CR$) | Winning Supplier Profile |
| :--- | :--- | :--- | :---: | :--- |
| **P3.1.1** | **Cost-Dominant Commodity** | Price: 65%, Qual: 15%, Deliv: 15%, ESG: 5% | $0.0122 < 0.10$ | **Apex Budget Supplies** ($S_i = 0.6470$) wins on lowest unit price. |
| **P3.1.2** | **Quality-Critical / Aerospace** | Qual: 55%, Price: 20%, Deliv: 15%, ESG: 10% | $0.0381 < 0.10$ | **Vanguard Precision** ($S_i = 0.6938$) wins on 36-mo warranty + ISO. |
| **P3.1.3** | **Expedited JIT / Emergency** | Deliv: 55%, Qual: 20%, Price: 15%, ESG: 10% | $0.0462 < 0.10$ | **SwiftLogistics Express** ($S_i = 0.7289$) wins on 3-day turnaround. |
| **P3.1.4** | **Sustainability & MSME Tender** | ESG: 40%, Qual: 30%, Price: 15%, Deliv: 15% | $0.0210 < 0.10$ | **EcoGreen Solutions** ($S_i = 0.7188$) wins on carbon-neutral + MSME. |
| **P3.1.5** | **Balanced Multi-Criteria RFQ** | Price: 35%, Qual: 30%, Deliv: 25%, ESG: 10% | $0.0054 < 0.10$ | Well-balanced supplier wins over extreme single-attribute outliers. |

---

## 6. Handoff Specification for Frontend Visualization (Faisal / F3.4)

The payload returned by `/api/v1/ahp/pairwise` and `/api/v1/ahp/calculate` feeds the score breakdown visualizations in the frontend:

### JSON API Output Schema:
```json
{
  "rfq_id": 1001,
  "criteria_weights": {
    "price": 0.35,
    "quality": 0.30,
    "delivery": 0.25,
    "esg": 0.10
  },
  "consistency": {
    "lambda_max": 4.0145,
    "CI": 0.0048,
    "CR": 0.0054,
    "is_consistent": true,
    "message": "Matrix is consistent (CR < 0.10)"
  },
  "total_suppliers": 4,
  "rankings": [
    {
      "supplier_id": 103,
      "supplier_name": "SwiftLogistics Express",
      "ahp_score": 0.7425,
      "price_score": 0.5625,
      "quality_score": 0.6500,
      "delivery_score": 1.0000,
      "esg_score": 0.5000,
      "rank": 1
    }
  ]
}
```

### Chart Mapping Recommendations for F3.4:
1. **Radar / Spider Chart:** Plot `price_score`, `quality_score`, `delivery_score`, and `esg_score` on axes $[0.0, 1.0]$ to visualize multi-dimensional supplier capability profiles.
2. **Stacked Contribution Bar Chart:** For each supplier, display a stacked bar where segment height equals $w_k \cdot u_{ik}$, clearly demonstrating which criteria drove the supplier to Rank #1.
3. **Consistency Gauge:** Display $CR$ on a speedometer gauge where $[0.0, 0.10)$ is green ("Consistent") and $[0.10, 1.0]$ is red ("Inconsistent").

---

## 7. Mathematical Invariants & Verification Checklist

- [x] **Saaty RI Integrity:** Lookup values for $n \in [1, 9]$ verified against Saaty (1980).
- [x] **Transitive Proof:** Perfectly consistent matrices ($a_{ik} = a_{ij} a_{jk}$) yield $\lambda_{\max} \equiv n$, $CI \equiv 0.0$, $CR \equiv 0.0$.
- [x] **Perron-Frobenius Bound:** $\lambda_{\max} \ge n$ strictly verified for all positive reciprocal matrices.
- [x] **SciPy Eigenvector Validation:** Maximum difference between row-average approximation and SciPy's exact right principal eigenvector is $< 0.015$ ($1.5\%$).
- [x] **Scale Invariance:** Multiplying raw prices or delivery times by constant conversion factors yields identical normalized utility scores and rankings.
- [x] **Monotonic Dominance:** A supplier strictly outperforming another across all criteria is mathematically guaranteed to rank higher.
