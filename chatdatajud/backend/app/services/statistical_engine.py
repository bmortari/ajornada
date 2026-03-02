"""
Motor Estatístico Avançado para o agente Deep Research.

Fornece 6 funções avançadas utilizando numpy, scipy, statsmodels e scikit-learn:
  1. time_series_forecast  — decomposição + previsão (Holt-Winters / ARIMA)
  2. correlation_analysis  — Pearson, Spearman, p-valor
  3. hypothesis_test       — t-test, Mann-Whitney, ANOVA, chi², Shapiro-Wilk
  4. distribution_analysis — skewness, kurtosis, normalidade, fitting
  5. anomaly_detection     — Z-score, IQR, Isolation Forest
  6. regression_analysis   — regressão linear / polinomial, R², predições
"""

from __future__ import annotations

import json
import logging
import math
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats as sp_stats
from scipy.stats import shapiro, normaltest, mannwhitneyu, kruskal, chi2_contingency

logger = logging.getLogger(__name__)

# ── helpers ──────────────────────────────────────────────────────────

def _round(v: Any, decimals: int = 4) -> Any:
    """Round numeric values safely."""
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    if isinstance(v, (int, float, np.integer, np.floating)):
        return round(float(v), decimals)
    return v


def _safe_json(obj: dict) -> str:
    """Serialise with numpy-friendly default."""
    def default(o):
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.floating,)):
            return round(float(o), 6)
        if isinstance(o, np.ndarray):
            return [round(float(x), 6) if np.isfinite(x) else None for x in o]
        if isinstance(o, (np.bool_,)):
            return bool(o)
        if pd.isna(o):
            return None
        return str(o)
    return json.dumps(obj, ensure_ascii=False, default=default)


# ═══════════════════════════════════════════════════════════════════════
# 1.  TIME SERIES FORECAST
# ═══════════════════════════════════════════════════════════════════════

def time_series_forecast(tool_input: dict) -> str:
    """
    Decompõe uma série temporal e gera previsão com Holt-Winters exponential smoothing.
    Fallback para tendência linear simples se a série for muito curta.
    """
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    from statsmodels.tsa.seasonal import STL

    values = [float(v) for v in tool_input.get("values", [])]
    periods = tool_input.get("periods", [])  # labels temporais opcionais
    forecast_steps = int(tool_input.get("forecast_steps", 6))
    freq = tool_input.get("freq", "monthly")  # monthly | quarterly | yearly
    label = tool_input.get("label", "Série Temporal")

    if len(values) < 4:
        return _safe_json({"success": False, "error": "Série muito curta — mínimo 4 observações."})

    try:
        arr = np.array(values, dtype=float)
        n = len(arr)

        # ── Estatísticas descritivas da série ─────────────────────
        diffs = np.diff(arr)
        trend_direction = "crescente" if np.mean(diffs) > 0 else ("decrescente" if np.mean(diffs) < 0 else "estável")

        # Moving averages
        window = min(3, n)
        ma = pd.Series(arr).rolling(window=window, min_periods=1).mean().tolist()

        result: dict[str, Any] = {
            "success": True,
            "label": label,
            "n_observations": n,
            "trend_direction": trend_direction,
            "moving_average": [_round(v) for v in ma],
        }

        # ── Seasonal period auto-detect ───────────────────────────
        seasonal_period = {"monthly": 12, "quarterly": 4, "yearly": 1}.get(freq, 12)

        # ── Decomposition (STL) if enough data ────────────────────
        if n >= seasonal_period * 2 + 1 and seasonal_period > 1:
            try:
                series = pd.Series(arr)
                stl = STL(series, period=seasonal_period, robust=True).fit()
                result["decomposition"] = {
                    "trend": [_round(v) for v in stl.trend.tolist()],
                    "seasonal": [_round(v) for v in stl.seasonal.tolist()],
                    "residual": [_round(v) for v in stl.resid.tolist()],
                }
            except Exception as e:
                logger.warning("STL decomposition failed: %s", e)

        # ── Forecast ──────────────────────────────────────────────
        forecast_values = []
        forecast_lower = []
        forecast_upper = []

        # Try Holt-Winters (needs >= 2 * seasonal_period)
        hw_ok = False
        if n >= seasonal_period * 2 and seasonal_period > 1:
            try:
                model = ExponentialSmoothing(
                    arr,
                    trend="add",
                    seasonal="add",
                    seasonal_periods=seasonal_period,
                    initialization_method="estimated",
                ).fit(optimized=True)
                fc = model.forecast(forecast_steps)
                forecast_values = [_round(v) for v in fc.tolist()]

                # Simple confidence interval based on residual stddev
                residuals = model.resid
                sigma = float(np.std(residuals))
                for i, fv in enumerate(fc):
                    z = 1.96 * sigma * math.sqrt(i + 1)
                    forecast_lower.append(_round(fv - z))
                    forecast_upper.append(_round(fv + z))
                result["method"] = "Holt-Winters (Suavização Exponencial Tripla)"
                hw_ok = True
            except Exception as e:
                logger.warning("Holt-Winters failed, falling back: %s", e)

        # Fallback: Holt (double exponential — trend only)
        if not hw_ok and n >= 4:
            try:
                model = ExponentialSmoothing(
                    arr,
                    trend="add",
                    seasonal=None,
                    initialization_method="estimated",
                ).fit(optimized=True)
                fc = model.forecast(forecast_steps)
                forecast_values = [_round(v) for v in fc.tolist()]
                residuals = model.resid
                sigma = float(np.std(residuals))
                for i, fv in enumerate(fc):
                    z = 1.96 * sigma * math.sqrt(i + 1)
                    forecast_lower.append(_round(fv - z))
                    forecast_upper.append(_round(fv + z))
                result["method"] = "Holt (Suavização Exponencial Dupla — sem sazonalidade)"
                hw_ok = True
            except Exception as e:
                logger.warning("Holt failed, falling back to linear: %s", e)

        # Last resort: simple linear trend
        if not hw_ok:
            x = np.arange(n)
            slope, intercept, r, p, se = sp_stats.linregress(x, arr)
            future_x = np.arange(n, n + forecast_steps)
            fc = slope * future_x + intercept
            forecast_values = [_round(v) for v in fc.tolist()]
            residuals = arr - (slope * x + intercept)
            sigma = float(np.std(residuals))
            for i, fv in enumerate(fc):
                z = 1.96 * sigma * math.sqrt(i + 1)
                forecast_lower.append(_round(fv - z))
                forecast_upper.append(_round(fv + z))
            result["method"] = "Tendência Linear Simples"
            result["linear_trend"] = {"slope": _round(slope), "intercept": _round(intercept), "r_squared": _round(r ** 2)}

        result["forecast"] = {
            "steps": forecast_steps,
            "values": forecast_values,
            "confidence_lower_95": forecast_lower,
            "confidence_upper_95": forecast_upper,
        }

        if periods:
            result["periods"] = periods[:n]

        return _safe_json(result)

    except Exception as e:
        logger.error("time_series_forecast error: %s", e, exc_info=True)
        return _safe_json({"success": False, "error": f"Erro na previsão: {str(e)}"})


# ═══════════════════════════════════════════════════════════════════════
# 2.  CORRELATION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════

def correlation_analysis(tool_input: dict) -> str:
    """Pearson + Spearman correlation with p-values and interpretation."""
    values_a = np.array([float(v) for v in tool_input.get("values_a", [])], dtype=float)
    values_b = np.array([float(v) for v in tool_input.get("values_b", [])], dtype=float)
    label_a = tool_input.get("label_a", "Variável A")
    label_b = tool_input.get("label_b", "Variável B")

    if len(values_a) < 3 or len(values_b) < 3:
        return _safe_json({"success": False, "error": "Mínimo 3 observações em cada variável."})
    if len(values_a) != len(values_b):
        return _safe_json({"success": False, "error": f"Arrays de tamanhos diferentes: {len(values_a)} vs {len(values_b)}"})

    try:
        # Pearson (linear correlation)
        pearson_r, pearson_p = sp_stats.pearsonr(values_a, values_b)
        # Spearman (rank / monotonic correlation)
        spearman_r, spearman_p = sp_stats.spearmanr(values_a, values_b)

        # Interpretation
        abs_r = abs(pearson_r)
        if abs_r >= 0.9:
            strength = "muito forte"
        elif abs_r >= 0.7:
            strength = "forte"
        elif abs_r >= 0.5:
            strength = "moderada"
        elif abs_r >= 0.3:
            strength = "fraca"
        else:
            strength = "muito fraca ou inexistente"

        direction = "positiva" if pearson_r > 0 else ("negativa" if pearson_r < 0 else "nula")
        significant = pearson_p < 0.05

        result = {
            "success": True,
            "label_a": label_a,
            "label_b": label_b,
            "n": len(values_a),
            "pearson": {
                "r": _round(pearson_r),
                "p_value": _round(pearson_p, 6),
                "significant": significant,
            },
            "spearman": {
                "rho": _round(spearman_r),
                "p_value": _round(spearman_p, 6),
                "significant": spearman_p < 0.05,
            },
            "interpretation": {
                "strength": strength,
                "direction": direction,
                "significant_at_5pct": significant,
                "summary": (
                    f"Correlação {strength} e {direction} entre {label_a} e {label_b} "
                    f"(r = {_round(pearson_r)}, p = {_round(pearson_p, 6)}). "
                    f"{'Estatisticamente significativa.' if significant else 'Não significativa ao nível de 5%.'}"
                ),
            },
        }
        return _safe_json(result)

    except Exception as e:
        logger.error("correlation_analysis error: %s", e, exc_info=True)
        return _safe_json({"success": False, "error": f"Erro na correlação: {str(e)}"})


# ═══════════════════════════════════════════════════════════════════════
# 3.  HYPOTHESIS TEST
# ═══════════════════════════════════════════════════════════════════════

def hypothesis_test(tool_input: dict) -> str:
    """Run statistical hypothesis tests on data."""
    test_type = tool_input.get("test_type", "t_test")
    values_a = [float(v) for v in tool_input.get("values_a", [])]
    values_b = [float(v) for v in tool_input.get("values_b", [])]
    groups = tool_input.get("groups", [])        # list of lists for ANOVA / Kruskal
    categories = tool_input.get("categories", [])  # contingency table rows for chi²
    alpha = float(tool_input.get("alpha", 0.05))
    label = tool_input.get("label", "Teste de Hipótese")

    try:
        result: dict[str, Any] = {"success": True, "test_type": test_type, "label": label, "alpha": alpha}

        if test_type == "t_test":
            if not values_a or not values_b:
                return _safe_json({"success": False, "error": "t_test requer values_a e values_b."})
            stat, p = sp_stats.ttest_ind(values_a, values_b, equal_var=False)  # Welch's t-test
            result.update({
                "statistic": _round(stat),
                "p_value": _round(p, 6),
                "reject_h0": p < alpha,
                "interpretation": (
                    f"{'Diferença significativa' if p < alpha else 'Sem diferença significativa'} "
                    f"entre os dois grupos (t = {_round(stat)}, p = {_round(p, 6)})."
                ),
                "group_a": {"n": len(values_a), "mean": _round(np.mean(values_a)), "std": _round(np.std(values_a, ddof=1))},
                "group_b": {"n": len(values_b), "mean": _round(np.mean(values_b)), "std": _round(np.std(values_b, ddof=1))},
            })

        elif test_type == "mann_whitney":
            if not values_a or not values_b:
                return _safe_json({"success": False, "error": "mann_whitney requer values_a e values_b."})
            stat, p = mannwhitneyu(values_a, values_b, alternative="two-sided")
            result.update({
                "statistic": _round(stat),
                "p_value": _round(p, 6),
                "reject_h0": p < alpha,
                "interpretation": (
                    f"{'Diferença significativa' if p < alpha else 'Sem diferença significativa'} "
                    f"entre os dois grupos (U = {_round(stat)}, p = {_round(p, 6)}). "
                    "Teste não-paramétrico (não assume normalidade)."
                ),
            })

        elif test_type == "anova":
            all_groups = groups if groups else [values_a, values_b] if values_b else [values_a]
            if len(all_groups) < 2:
                return _safe_json({"success": False, "error": "ANOVA requer pelo menos 2 grupos."})
            float_groups = [[float(v) for v in g] for g in all_groups]
            stat, p = sp_stats.f_oneway(*float_groups)
            group_stats = [
                {"group": i + 1, "n": len(g), "mean": _round(np.mean(g)), "std": _round(np.std(g, ddof=1))}
                for i, g in enumerate(float_groups)
            ]
            result.update({
                "statistic": _round(stat),
                "p_value": _round(p, 6),
                "reject_h0": p < alpha,
                "n_groups": len(float_groups),
                "group_stats": group_stats,
                "interpretation": (
                    f"{'Diferença significativa' if p < alpha else 'Sem diferença significativa'} "
                    f"entre os {len(float_groups)} grupos (F = {_round(stat)}, p = {_round(p, 6)})."
                ),
            })

        elif test_type == "kruskal":
            all_groups = groups if groups else [values_a, values_b] if values_b else [values_a]
            if len(all_groups) < 2:
                return _safe_json({"success": False, "error": "Kruskal-Wallis requer pelo menos 2 grupos."})
            float_groups = [[float(v) for v in g] for g in all_groups]
            stat, p = kruskal(*float_groups)
            result.update({
                "statistic": _round(stat),
                "p_value": _round(p, 6),
                "reject_h0": p < alpha,
                "n_groups": len(float_groups),
                "interpretation": (
                    f"{'Diferença significativa' if p < alpha else 'Sem diferença significativa'} "
                    f"entre os grupos (H = {_round(stat)}, p = {_round(p, 6)}). "
                    "Teste não-paramétrico."
                ),
            })

        elif test_type == "chi_squared":
            if not categories:
                return _safe_json({"success": False, "error": "chi_squared requer 'categories' (tabela de contingência como lista de listas)."})
            table = np.array([[float(v) for v in row] for row in categories])
            chi2, p, dof, expected = chi2_contingency(table)
            result.update({
                "statistic": _round(chi2),
                "p_value": _round(p, 6),
                "degrees_of_freedom": int(dof),
                "reject_h0": p < alpha,
                "expected_frequencies": [[_round(v) for v in row] for row in expected.tolist()],
                "interpretation": (
                    f"{'Associação significativa' if p < alpha else 'Sem associação significativa'} "
                    f"entre as variáveis (χ² = {_round(chi2)}, gl = {int(dof)}, p = {_round(p, 6)})."
                ),
            })

        elif test_type == "shapiro":
            vals = values_a if values_a else values_b
            if not vals:
                return _safe_json({"success": False, "error": "shapiro requer values_a."})
            if len(vals) > 5000:
                vals = vals[:5000]  # Shapiro limit
            stat, p = shapiro(vals)
            result.update({
                "statistic": _round(stat),
                "p_value": _round(p, 6),
                "is_normal": p >= alpha,
                "n": len(vals),
                "interpretation": (
                    f"Os dados {'seguem' if p >= alpha else 'NÃO seguem'} distribuição normal "
                    f"(W = {_round(stat)}, p = {_round(p, 6)})."
                ),
            })

        else:
            return _safe_json({"success": False, "error": f"Tipo de teste desconhecido: {test_type}. Válidos: t_test, mann_whitney, anova, kruskal, chi_squared, shapiro"})

        return _safe_json(result)

    except Exception as e:
        logger.error("hypothesis_test error: %s", e, exc_info=True)
        return _safe_json({"success": False, "error": f"Erro no teste: {str(e)}"})


# ═══════════════════════════════════════════════════════════════════════
# 4.  DISTRIBUTION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════

def distribution_analysis(tool_input: dict) -> str:
    """Analyse the distribution shape, normality, and fit candidate distributions."""
    values = np.array([float(v) for v in tool_input.get("values", [])], dtype=float)
    label = tool_input.get("label", "Dados")
    labels = tool_input.get("labels", [])

    if len(values) < 3:
        return _safe_json({"success": False, "error": "Mínimo 3 valores para análise de distribuição."})

    try:
        n = len(values)
        arr = np.sort(values)

        # Basic moments
        mean = float(np.mean(arr))
        std = float(np.std(arr, ddof=1))
        skewness = float(sp_stats.skew(arr, bias=False))
        kurt = float(sp_stats.kurtosis(arr, bias=False))  # excess kurtosis

        # Percentiles
        percentiles = {
            "p5": _round(np.percentile(arr, 5)),
            "p10": _round(np.percentile(arr, 10)),
            "p25": _round(np.percentile(arr, 25)),
            "p50": _round(np.percentile(arr, 50)),
            "p75": _round(np.percentile(arr, 75)),
            "p90": _round(np.percentile(arr, 90)),
            "p95": _round(np.percentile(arr, 95)),
        }

        # Normality tests
        normality: dict[str, Any] = {}
        if n >= 8:
            try:
                w_stat, w_p = shapiro(arr[:5000])
                normality["shapiro_wilk"] = {"statistic": _round(w_stat), "p_value": _round(w_p, 6), "is_normal": w_p >= 0.05}
            except Exception:
                pass
        if n >= 20:
            try:
                da_stat, da_p = normaltest(arr)
                normality["dagostino_pearson"] = {"statistic": _round(da_stat), "p_value": _round(da_p, 6), "is_normal": da_p >= 0.05}
            except Exception:
                pass

        # Histogram data (for potential charting)
        n_bins = min(max(int(np.sqrt(n)), 5), 30)
        counts, bin_edges = np.histogram(arr, bins=n_bins)
        histogram = [
            {"bin_start": _round(bin_edges[i]), "bin_end": _round(bin_edges[i + 1]), "count": int(counts[i])}
            for i in range(len(counts))
        ]

        # Skewness / kurtosis interpretation
        if abs(skewness) < 0.5:
            skew_interp = "aproximadamente simétrica"
        elif skewness > 0:
            skew_interp = "assimétrica positiva (cauda longa à direita — maioria dos valores concentrados à esquerda)"
        else:
            skew_interp = "assimétrica negativa (cauda longa à esquerda — maioria dos valores concentrados à direita)"

        if kurt < -1:
            kurt_interp = "platicúrtica (caudas leves, distribuição mais achatada que normal)"
        elif kurt > 1:
            kurt_interp = "leptocúrtica (caudas pesadas, pico mais acentuado que normal)"
        else:
            kurt_interp = "mesocúrtica (semelhante à normal)"

        # Fit candidate distributions
        fits: list[dict] = []
        positive_values = arr[arr > 0]
        candidates = [("norm", "Normal"), ("expon", "Exponencial")]
        if len(positive_values) == len(arr):
            candidates.append(("lognorm", "Log-Normal"))

        for dist_name, dist_label in candidates:
            try:
                dist = getattr(sp_stats, dist_name)
                params = dist.fit(arr)
                # Kolmogorov-Smirnov test
                ks_stat, ks_p = sp_stats.kstest(arr, dist_name, args=params)
                fits.append({
                    "distribution": dist_label,
                    "ks_statistic": _round(ks_stat),
                    "ks_p_value": _round(ks_p, 6),
                    "good_fit": ks_p >= 0.05,
                    "parameters": [_round(p) for p in params],
                })
            except Exception:
                pass

        # Sort fits by KS p-value (best fit first)
        fits.sort(key=lambda x: x.get("ks_p_value", 0) or 0, reverse=True)

        result = {
            "success": True,
            "label": label,
            "n": n,
            "descriptive": {
                "mean": _round(mean),
                "std": _round(std),
                "min": _round(float(arr[0])),
                "max": _round(float(arr[-1])),
                "range": _round(float(arr[-1] - arr[0])),
            },
            "percentiles": percentiles,
            "shape": {
                "skewness": _round(skewness),
                "skewness_interpretation": skew_interp,
                "kurtosis_excess": _round(kurt),
                "kurtosis_interpretation": kurt_interp,
            },
            "normality_tests": normality,
            "histogram": histogram,
            "distribution_fits": fits,
        }

        return _safe_json(result)

    except Exception as e:
        logger.error("distribution_analysis error: %s", e, exc_info=True)
        return _safe_json({"success": False, "error": f"Erro na análise de distribuição: {str(e)}"})


# ═══════════════════════════════════════════════════════════════════════
# 5.  ANOMALY DETECTION
# ═══════════════════════════════════════════════════════════════════════

def anomaly_detection(tool_input: dict) -> str:
    """Detect anomalies using Z-score, IQR, or Isolation Forest."""
    values = np.array([float(v) for v in tool_input.get("values", [])], dtype=float)
    labels = tool_input.get("labels", [])
    method = tool_input.get("method", "zscore")
    threshold = float(tool_input.get("threshold", 2.5))
    label = tool_input.get("label", "Dados")

    if len(values) < 3:
        return _safe_json({"success": False, "error": "Mínimo 3 valores para detecção de anomalias."})

    try:
        n = len(values)
        anomalies: list[dict] = []
        scores: list[float] = []

        if method == "zscore":
            mean = float(np.mean(values))
            std = float(np.std(values, ddof=1))
            if std == 0:
                return _safe_json({"success": True, "label": label, "method": "Z-Score", "n": n, "anomalies": [], "summary": "Desvio padrão = 0, todos os valores são iguais."})
            z_scores = np.abs((values - mean) / std)
            scores = [_round(float(z)) for z in z_scores]
            for i, (v, z) in enumerate(zip(values, z_scores)):
                if z > threshold:
                    lbl = labels[i] if i < len(labels) else f"Obs {i + 1}"
                    anomalies.append({"index": i, "label": lbl, "value": _round(float(v)), "z_score": _round(float(z)), "severity": "extrema" if z > 3.5 else "alta"})

        elif method == "iqr":
            q1 = float(np.percentile(values, 25))
            q3 = float(np.percentile(values, 75))
            iqr = q3 - q1
            multiplier = threshold if threshold != 2.5 else 1.5
            lower = q1 - multiplier * iqr
            upper = q3 + multiplier * iqr
            for i, v in enumerate(values):
                fv = float(v)
                if fv < lower or fv > upper:
                    lbl = labels[i] if i < len(labels) else f"Obs {i + 1}"
                    distance = abs(fv - lower) if fv < lower else abs(fv - upper)
                    anomalies.append({"index": i, "label": lbl, "value": _round(fv), "direction": "abaixo" if fv < lower else "acima", "distance_from_bound": _round(distance)})

        elif method == "isolation_forest":
            from sklearn.ensemble import IsolationForest
            contamination = min(0.1, max(0.01, 1.0 / n))
            clf = IsolationForest(contamination=contamination, random_state=42, n_estimators=100)
            preds = clf.fit_predict(values.reshape(-1, 1))
            anomaly_scores = clf.score_samples(values.reshape(-1, 1))
            scores = [_round(float(s)) for s in anomaly_scores]
            for i, (v, pred, score) in enumerate(zip(values, preds, anomaly_scores)):
                if pred == -1:
                    lbl = labels[i] if i < len(labels) else f"Obs {i + 1}"
                    anomalies.append({"index": i, "label": lbl, "value": _round(float(v)), "anomaly_score": _round(float(score))})

        else:
            return _safe_json({"success": False, "error": f"Método desconhecido: {method}. Válidos: zscore, iqr, isolation_forest"})

        # Sort anomalies by value (most extreme first)
        anomalies.sort(key=lambda x: abs(x.get("value", 0)), reverse=True)

        result: dict[str, Any] = {
            "success": True,
            "label": label,
            "method": {"zscore": "Z-Score", "iqr": "IQR (Intervalo Interquartil)", "isolation_forest": "Isolation Forest (Machine Learning)"}[method],
            "n": n,
            "n_anomalies": len(anomalies),
            "anomaly_rate_pct": _round(len(anomalies) / n * 100),
            "anomalies": anomalies[:30],  # cap at 30
        }

        if method == "zscore" and scores:
            result["mean_z_score"] = _round(float(np.mean(np.abs(values - np.mean(values)) / np.std(values, ddof=1))))

        if method == "iqr":
            q1 = float(np.percentile(values, 25))
            q3 = float(np.percentile(values, 75))
            result["bounds"] = {"q1": _round(q1), "q3": _round(q3), "lower": _round(q1 - 1.5 * (q3 - q1)), "upper": _round(q3 + 1.5 * (q3 - q1))}

        result["summary"] = (
            f"Detectadas **{len(anomalies)}** anomalias em {n} observações "
            f"({_round(len(anomalies) / n * 100)}%) usando {result['method']}."
        )

        return _safe_json(result)

    except Exception as e:
        logger.error("anomaly_detection error: %s", e, exc_info=True)
        return _safe_json({"success": False, "error": f"Erro na detecção de anomalias: {str(e)}"})


# ═══════════════════════════════════════════════════════════════════════
# 6.  REGRESSION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════

def regression_analysis(tool_input: dict) -> str:
    """Fit linear or polynomial regression, compute R², and make predictions."""
    x_values = np.array([float(v) for v in tool_input.get("x_values", [])], dtype=float)
    y_values = np.array([float(v) for v in tool_input.get("y_values", [])], dtype=float)
    degree = min(int(tool_input.get("degree", 1)), 3)  # cap at 3 to avoid overfitting
    x_label = tool_input.get("x_label", "X")
    y_label = tool_input.get("y_label", "Y")
    predict_x = tool_input.get("predict_x", [])

    if len(x_values) < 3 or len(y_values) < 3:
        return _safe_json({"success": False, "error": "Mínimo 3 observações para regressão."})
    if len(x_values) != len(y_values):
        return _safe_json({"success": False, "error": f"X e Y de tamanhos diferentes: {len(x_values)} vs {len(y_values)}"})

    try:
        n = len(x_values)

        if degree == 1:
            # Use scipy linregress for extra stats
            slope, intercept, r_value, p_value, std_err = sp_stats.linregress(x_values, y_values)
            r_squared = r_value ** 2
            coefficients = [_round(intercept), _round(slope)]
            equation = f"{y_label} = {_round(slope)} × {x_label} + {_round(intercept)}"
            y_pred = slope * x_values + intercept

            result: dict[str, Any] = {
                "success": True,
                "type": "Regressão Linear",
                "degree": 1,
                "x_label": x_label,
                "y_label": y_label,
                "n": n,
                "coefficients": {"intercept": _round(intercept), "slope": _round(slope)},
                "equation": equation,
                "r_squared": _round(r_squared),
                "r": _round(r_value),
                "p_value": _round(p_value, 6),
                "std_error": _round(std_err),
                "significant": p_value < 0.05,
            }
        else:
            # Polynomial regression via numpy
            coeffs = np.polyfit(x_values, y_values, degree)
            poly = np.poly1d(coeffs)
            y_pred = poly(x_values)

            # R²
            ss_res = np.sum((y_values - y_pred) ** 2)
            ss_tot = np.sum((y_values - np.mean(y_values)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

            # Adjusted R²
            adj_r_squared = 1 - ((1 - r_squared) * (n - 1) / (n - degree - 1)) if n > degree + 1 else r_squared

            # Build equation string
            terms = []
            for i, c in enumerate(coeffs):
                exp = degree - i
                if exp == 0:
                    terms.append(f"{_round(c)}")
                elif exp == 1:
                    terms.append(f"{_round(c)}×{x_label}")
                else:
                    terms.append(f"{_round(c)}×{x_label}^{exp}")
            equation = f"{y_label} = " + " + ".join(terms)

            result = {
                "success": True,
                "type": f"Regressão Polinomial (grau {degree})",
                "degree": degree,
                "x_label": x_label,
                "y_label": y_label,
                "n": n,
                "coefficients": [_round(c) for c in coeffs.tolist()],
                "equation": equation,
                "r_squared": _round(r_squared),
                "adjusted_r_squared": _round(adj_r_squared),
            }

        # Residuals summary
        residuals = y_values - y_pred
        result["residuals"] = {
            "mean": _round(float(np.mean(residuals))),
            "std": _round(float(np.std(residuals, ddof=1))),
            "min": _round(float(np.min(residuals))),
            "max": _round(float(np.max(residuals))),
        }

        # Predictions for requested x values
        if predict_x:
            px = [float(v) for v in predict_x]
            if degree == 1:
                py = [_round(slope * x + intercept) for x in px]
            else:
                py = [_round(float(poly(x))) for x in px]
            result["predictions"] = [{"x": _round(x), "predicted_y": y} for x, y in zip(px, py)]

        # Quality interpretation
        if r_squared >= 0.9:
            fit_quality = "excelente"
        elif r_squared >= 0.7:
            fit_quality = "bom"
        elif r_squared >= 0.5:
            fit_quality = "moderado"
        else:
            fit_quality = "fraco"

        result["interpretation"] = (
            f"Modelo de regressão {'linear' if degree == 1 else f'polinomial (grau {degree})'} "
            f"com ajuste **{fit_quality}** (R² = {_round(r_squared)}). "
            f"O modelo explica {_round(r_squared * 100)}% da variação em {y_label}."
        )

        return _safe_json(result)

    except Exception as e:
        logger.error("regression_analysis error: %s", e, exc_info=True)
        return _safe_json({"success": False, "error": f"Erro na regressão: {str(e)}"})
