from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

import requests

from app.utils.config import BACKEND_BASE_URL, BACKEND_CHAT_PATH, OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from app.utils.logger import logger
from app.services.conversation_state import get_pending_conversation


def _unwrap_backend_payload(payload: Any) -> Dict[str, Any]:
    if isinstance(payload, dict) and "success" in payload and "data" in payload:
        data = payload.get("data")
        return data if isinstance(data, dict) else {}
    return payload if isinstance(payload, dict) else {}


def _fetch_user_context_snapshot(user_id: str) -> Dict[str, Any]:
    base_url = BACKEND_BASE_URL.rstrip("/")
    snapshot: Dict[str, Any] = {
        "transaction_count": 0,
        "totals": {"sales": 0, "expenses": 0},
        "recent_transactions": [],
        "top_items": [],
        "dashboard": {
            "available": False,
            "summary": {},
        },
        "heatmap": {
            "available": False,
            "top_areas": [],
        },
        "has_context": False,
    }

    try:
        history_response = requests.get(
            f"{base_url}/api/transactions/history",
            params={"userId": user_id, "limit": 30},
            timeout=15,
        )
        if history_response.status_code < 400:
            history_data = _unwrap_backend_payload(history_response.json() or {})
            transactions = history_data.get("transactions") or []
            snapshot["transaction_count"] = int(history_data.get("count") or len(transactions))

            recent_transactions = []
            item_totals: Dict[str, float] = {}
            for tx in transactions[:8]:
                raw_text = str(tx.get("rawText") or "").strip()
                if raw_text:
                    recent_transactions.append(raw_text)

                for sale in tx.get("sales") or []:
                    item = str(sale.get("item") or "").strip().lower()
                    qty = float(_safe_number(sale.get("qty")))
                    if item:
                        item_totals[item] = item_totals.get(item, 0.0) + qty

            snapshot["recent_transactions"] = recent_transactions[:5]
            snapshot["top_items"] = [
                name for name, _ in sorted(item_totals.items(), key=lambda row: row[1], reverse=True)[:4]
            ]
    except Exception as exc:
        logger.warning("Could not fetch transaction context snapshot: %s", exc)

    try:
        insights_response = requests.get(
            f"{base_url}/api/insights",
            params={"userId": user_id},
            timeout=12,
        )
        if insights_response.status_code < 400:
            insights_data = _unwrap_backend_payload(insights_response.json() or {})
            totals = insights_data.get("totals") if isinstance(insights_data, dict) else {}
            if isinstance(totals, dict):
                snapshot["totals"] = {
                    "sales": float(totals.get("sales") or 0.0),
                    "expenses": float(totals.get("expenses") or 0.0),
                }
    except Exception as exc:
        logger.warning("Could not fetch insights context snapshot: %s", exc)

    try:
        dashboard_response = requests.get(
            f"{base_url}/api/analytics/dashboard",
            params={"userId": user_id},
            timeout=15,
        )
        if dashboard_response.status_code < 400:
            dashboard_data = _unwrap_backend_payload(dashboard_response.json() or {})
            dashboard_payload = dashboard_data.get("dashboard") if isinstance(dashboard_data, dict) else {}

            if isinstance(dashboard_payload, dict):
                summary = {}

                kpis = dashboard_payload.get("kpis")
                if isinstance(kpis, dict):
                    summary["kpis"] = {
                        "revenue": float(kpis.get("totalRevenue") or 0.0),
                        "profit": float(kpis.get("totalProfit") or 0.0),
                        "margin": float(kpis.get("profitMargin") or 0.0),
                    }

                predictions = dashboard_payload.get("predictions")
                if isinstance(predictions, dict):
                    summary["predictions"] = {
                        "nextDaySales": float(predictions.get("nextDaySales") or 0.0),
                        "confidence": float(predictions.get("confidence") or 0.0),
                    }

                alerts = dashboard_payload.get("alerts")
                if isinstance(alerts, dict):
                    summary["alerts"] = {
                        "high": int(alerts.get("high") or 0),
                        "medium": int(alerts.get("medium") or 0),
                        "low": int(alerts.get("low") or 0),
                    }

                if summary:
                    snapshot["dashboard"] = {
                        "available": True,
                        "summary": summary,
                    }
    except Exception as exc:
        logger.warning("Could not fetch dashboard context snapshot: %s", exc)

    try:
        map_points_response = requests.get(
            f"{base_url}/api/map-points",
            timeout=12,
        )
        if map_points_response.status_code < 400:
            map_points_data = _unwrap_backend_payload(map_points_response.json() or {})
            points = map_points_data.get("points") if isinstance(map_points_data, dict) else []
            ranked_points: List[Dict[str, Any]] = []

            if isinstance(points, list):
                for point in points:
                    if not isinstance(point, dict):
                        continue
                    lat = point.get("lat")
                    lng = point.get("lng")
                    if lat is None or lng is None:
                        continue
                    try:
                        parsed_lat = float(lat)
                        parsed_lng = float(lng)
                    except (TypeError, ValueError):
                        continue
                    ranked_points.append({
                        "name": str(point.get("name") or point.get("area") or "Area").strip() or "Area",
                        "lat": parsed_lat,
                        "lng": parsed_lng,
                        "activity": float(point.get("activity") or point.get("weight") or point.get("count") or 0.0),
                    })

            ranked_points = sorted(
                ranked_points,
                key=lambda entry: entry.get("activity", 0.0),
                reverse=True,
            )
            snapshot["heatmap"] = {
                "available": bool(ranked_points),
                "top_areas": ranked_points[:5],
            }
    except Exception as exc:
        logger.warning("Could not fetch heatmap map-points snapshot: %s", exc)

    try:
        top_areas = (snapshot.get("heatmap") or {}).get("top_areas") or []
        primary_area = top_areas[0] if isinstance(top_areas, list) and top_areas else None
        if isinstance(primary_area, dict):
            area_response = requests.get(
                f"{base_url}/api/area-insights",
                params={
                    "lat": primary_area.get("lat"),
                    "lng": primary_area.get("lng"),
                    "radiusKm": 2,
                },
                timeout=15,
            )
            if area_response.status_code < 400:
                area_data = _unwrap_backend_payload(area_response.json() or {})
                top_items = area_data.get("topItems") if isinstance(area_data, dict) else []
                trends = area_data.get("trends") if isinstance(area_data, dict) else {}
                recommendations = area_data.get("recommendations") if isinstance(area_data, dict) else []

                snapshot["heatmap"] = {
                    "available": True,
                    "top_areas": top_areas,
                    "primary_area": {
                        "name": str(area_data.get("areaName") or primary_area.get("name") or "Area").strip() or "Area",
                        "transaction_count": int(area_data.get("transactionCount") or 0),
                        "top_items": top_items[:5] if isinstance(top_items, list) else [],
                        "trend_summary": trends if isinstance(trends, dict) else {},
                        "recommendations": recommendations[:5] if isinstance(recommendations, list) else [],
                    },
                }
    except Exception as exc:
        logger.warning("Could not fetch area-insights snapshot: %s", exc)

    snapshot["has_context"] = bool(
        snapshot["transaction_count"]
        or snapshot["recent_transactions"]
        or snapshot["totals"].get("sales")
        or snapshot["totals"].get("expenses")
        or (snapshot.get("dashboard") or {}).get("available")
        or (snapshot.get("heatmap") or {}).get("available")
    )
    return snapshot


def _build_pipeline_results_from_snapshot(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    totals = snapshot.get("totals") if isinstance(snapshot.get("totals"), dict) else {}
    dashboard = snapshot.get("dashboard") if isinstance(snapshot.get("dashboard"), dict) else {}
    heatmap = snapshot.get("heatmap") if isinstance(snapshot.get("heatmap"), dict) else {}

    return {
        "insights": {
            "transaction_count": int(snapshot.get("transaction_count") or 0),
            "totals": {
                "sales": float(totals.get("sales") or 0.0),
                "expenses": float(totals.get("expenses") or 0.0),
            },
            "top_items": (snapshot.get("top_items") or [])[:5],
        },
        "transaction_history": {
            "recent_transactions": (snapshot.get("recent_transactions") or [])[:5],
        },
        "dashboard": {
            "available": bool(dashboard.get("available")),
            "summary": dashboard.get("summary") if isinstance(dashboard.get("summary"), dict) else {},
        },
        "heatmap": {
            "available": bool(heatmap.get("available")),
            "top_areas": (heatmap.get("top_areas") or [])[:5],
            "primary_area": heatmap.get("primary_area") if isinstance(heatmap.get("primary_area"), dict) else {},
        },
        "has_context": bool(snapshot.get("has_context")),
    }


def get_pipeline_results(user_id: str) -> Dict[str, Any]:
    snapshot = _fetch_user_context_snapshot(user_id)
    return _build_pipeline_results_from_snapshot(snapshot)


def _build_agent_mode_prompts(user_id: str, transcript: str) -> Tuple[str, str]:
    style = _detect_language_style(transcript)
    style_instruction = {
        "hindi": "Hindi",
        "hinglish": "Hinglish",
        "english": "English",
    }.get(style, "Hinglish")

    context_snapshot = _fetch_user_context_snapshot(user_id)

    system_prompt = (
        "You are a personal AI business agent for a small business owner in India. "
        "Act like you know the user's history through the supplied context snapshot. "
        "Be concise, practical, and speech-friendly. "
        "Never invent facts; clearly say when context is missing."
    )

    user_prompt = (
        f"User ID: {user_id}\n"
        f"Reply language style: {style_instruction}\n"
        f"User question: {transcript.strip()}\n"
        f"Context snapshot: {json.dumps(context_snapshot, ensure_ascii=False)}\n"
        "Instructions:\n"
        "1) Answer using whichever pipeline context is relevant: insights, transaction history, dashboard analytics, and heatmap/area insights.\n"
        "2) If multiple pipelines are relevant, merge them into one concise answer.\n"
        "3) If answer depends on unavailable data, say what is missing and offer next step.\n"
        "4) Keep the reply <= 60 words and suitable for TTS output.\n"
        "Return only the final reply text."
    )
    return system_prompt, user_prompt


def _generate_openai_agent_reply(user_id: str, transcript: str) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None

    system_prompt, user_prompt = _build_agent_mode_prompts(user_id, transcript)
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": OPENAI_MODEL,
        "temperature": 0.25,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        base_url = OPENAI_BASE_URL.rstrip("/")
        response = requests.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=body,
            timeout=15,
        )
        if response.status_code >= 400:
            logger.warning("OpenAI agent-mode reply failed (%s): %s", response.status_code, response.text)
            return None

        content = (
            (response.json() or {})
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        reply = str(content or "").strip()
        return reply or None
    except Exception as exc:
        logger.warning("OpenAI agent-mode reply unavailable: %s", exc)
        return None


def _query_backend_assistant(user_id: str, transcript: str) -> Optional[str]:
    backend_url = f"{BACKEND_BASE_URL.rstrip('/')}/api/assistant/query"
    payload = {
        "userId": user_id,
        "message": transcript,
    }

    try:
        response = requests.post(backend_url, json=payload, timeout=40)
        if response.status_code >= 400:
            logger.warning("Backend assistant endpoint failed (%s): %s", response.status_code, response.text)
            return None

        response_data = _unwrap_backend_payload(response.json() or {})
        reply = str(response_data.get("reply") or "").strip()
        return reply or None
    except Exception as exc:
        logger.warning("Backend assistant endpoint unavailable: %s", exc)
        return None


def _query_backend_chat(user_id: str, message: str, stt_provider: str) -> Optional[str]:
    backend_url = f"{BACKEND_BASE_URL.rstrip('/')}{BACKEND_CHAT_PATH}"
    payload = {
        "userId": user_id,
        "message": message,
        "source": "voice",
        "sttProvider": stt_provider,
    }

    response = requests.post(backend_url, json=payload, timeout=60)

    if response.status_code >= 400:
        logger.error("Backend chat failed (%s): %s", response.status_code, response.text)
        return None

    response_data = _unwrap_backend_payload(response.json() or {})
    reply = response_data.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        return None
    return reply.strip()


def _has_finalized_transaction(structured_data: Optional[Dict[str, Any]]) -> bool:
    if not isinstance(structured_data, dict):
        return False

    meta = structured_data.get("meta") or {}
    if meta.get("needs_clarification"):
        return False

    return bool((structured_data.get("sales") or []) or (structured_data.get("expenses") or []))


def _detect_language_style(transcript: str) -> str:
    text = str(transcript or "")
    lowered = text.lower()

    if any("\u0900" <= char <= "\u097F" for char in text):
        return "hindi"

    hinglish_markers = [
        "aaj",
        "maine",
        "becha",
        "bechi",
        "haan",
        "han",
        "nahi",
        "nahin",
        "kitna",
        "kitni",
        "rupaye",
        "chai",
        "kharcha",
        "theek",
    ]
    if any(marker in lowered for marker in hinglish_markers):
        return "hinglish"

    return "english"


def _safe_number(value: Any) -> str:
    if isinstance(value, bool):
        return "0"
    if isinstance(value, (int, float)):
        return str(int(value) if float(value).is_integer() else round(float(value), 2))
    cleaned = "".join(ch for ch in str(value or "")
                      if ch.isdigit() or ch == ".")
    return cleaned or "0"


def _collect_missing_fields(structured_data: Optional[Dict[str, Any]]) -> List[str]:
    missing: List[str] = []
    if not isinstance(structured_data, dict):
        return ["transaction_details"]

    sales = structured_data.get("sales") or []
    expenses = structured_data.get("expenses") or []

    if not sales and not expenses:
        missing.append("transaction_type")

    for index, sale in enumerate(sales, start=1):
        if not str(sale.get("item") or "").strip():
            missing.append(f"sale_{index}_item")
        if float(_safe_number(sale.get("qty"))) <= 0:
            missing.append(f"sale_{index}_qty")
        if float(_safe_number(sale.get("price"))) <= 0:
            missing.append(f"sale_{index}_price")

    for index, expense in enumerate(expenses, start=1):
        if not str(expense.get("item") or "").strip():
            missing.append(f"expense_{index}_item")
        if float(_safe_number(expense.get("amount"))) <= 0:
            missing.append(f"expense_{index}_amount")

    return missing


def _build_specific_clarification_question(transcript: str, structured_data: Optional[Dict[str, Any]]) -> str:
    style = _detect_language_style(transcript)
    missing = _collect_missing_fields(structured_data)

    if not missing:
        if style in {"hindi", "hinglish"}:
            return "Kripya item, quantity aur amount ek baar confirm kar dijiye."
        return "Please confirm item, quantity, and amount once."

    if "transaction_type" in missing:
        if style in {"hindi", "hinglish"}:
            return "Yeh sale hai ya expense? Kripya item, quantity aur amount batayiye."
        return "Is this a sale or an expense? Please share item, quantity, and amount."

    if any(token.endswith("_qty") for token in missing):
        if style in {"hindi", "hinglish"}:
            return "Quantity clear nahi hai. Kitni quantity thi?"
        return "The quantity is unclear. What was the quantity?"

    if any(token.endswith("_price") or token.endswith("_amount") for token in missing):
        if style in {"hindi", "hinglish"}:
            return "Amount clear nahi hai. Kitna amount tha?"
        return "The amount is unclear. What was the amount?"

    if style in {"hindi", "hinglish"}:
        return "Kripya transaction thoda clearly batayiye: item, quantity, amount."
    return "Please restate the transaction clearly with item, quantity, and amount."


def _normalize_text_for_compare(text: str) -> str:
    return " ".join("".join(ch.lower() if ch.isalnum() or ch.isspace() else " " for ch in str(text or "")).split())


def _questions_are_similar(current_question: str, previous_question: str) -> bool:
    current = _normalize_text_for_compare(current_question)
    previous = _normalize_text_for_compare(previous_question)
    if not current or not previous:
        return False
    return current == previous or current in previous or previous in current


def _build_progressive_clarification_question(
    transcript: str,
    structured_data: Optional[Dict[str, Any]],
    pending_state: Optional[Dict[str, Any]],
) -> str:
    style = _detect_language_style(transcript)
    base_question = _build_specific_clarification_question(
        transcript, structured_data)

    turn_count = int((pending_state or {}).get(
        "clarification_turn_count") or 0)
    if turn_count <= 1:
        return base_question

    if style in {"hindi", "hinglish"}:
        prefixes = [
            "Samjha. Bas ek detail aur:",
            "Thanks, almost done. Bas yeh clear kariye:",
            "Final confirm karte hain:",
        ]
    else:
        prefixes = [
            "Got it. One more detail:",
            "Thanks, almost done. Please clarify:",
            "Final confirmation:",
        ]

    prefix = prefixes[min(turn_count - 2, len(prefixes) - 1)]
    return f"{prefix} {base_question}"


def _pick_variant(transcript: str, variants: List[str]) -> str:
    if not variants:
        return ""
    index = sum(ord(ch) for ch in str(transcript or "")) % len(variants)
    return variants[index]


def _build_grounded_reply(transcript: str, structured_data: Optional[Dict[str, Any]]) -> str:
    sales = (structured_data or {}).get("sales") or []
    expenses = (structured_data or {}).get("expenses") or []
    style = _detect_language_style(transcript)

    if sales:
        parts = []
        total_sales = 0.0
        for sale in sales:
            qty = _safe_number(sale.get("qty"))
            item = str(sale.get("item") or "item").strip()
            price = _safe_number(sale.get("price"))
            try:
                total_sales += float(qty) * float(price)
            except ValueError:
                pass

            if style in {"hindi", "hinglish"}:
                parts.append(f"{qty} {item} {price} rupaye")
            else:
                parts.append(f"{qty} {item} at {price} rupees")

        joined = ", ".join(parts)
        if style == "hindi":
            variants = [
                f"ठीक है, मैंने नोट किया: {joined}. कुल बिक्री लगभग {_safe_number(total_sales)} रुपये।",
                f"समझ गया, एंट्री कर दी: {joined}. कुल बिक्री करीब {_safe_number(total_sales)} रुपये।",
                f"नोट हो गया: {joined}. अभी तक कुल बिक्री {_safe_number(total_sales)} रुपये है।",
            ]
            return _pick_variant(transcript, variants)
        if style == "hinglish":
            variants = [
                f"Theek hai, maine note kiya: {joined}. Total sale approx {_safe_number(total_sales)} rupaye.",
                f"Done, entry save kar di: {joined}. Total sale around {_safe_number(total_sales)} rupaye.",
                f"Samjha, yeh record kar liya: {joined}. Abhi total sale {_safe_number(total_sales)} rupaye hai.",
            ]
            return _pick_variant(transcript, variants)
        return f"Okay, noted: {joined}. Total sales are about {_safe_number(total_sales)} rupees."

    if expenses:
        parts = []
        total_expense = 0.0
        for expense in expenses:
            item = str(expense.get("item") or "expense").strip()
            amount = _safe_number(expense.get("amount"))
            try:
                total_expense += float(amount)
            except ValueError:
                pass
            if style in {"hindi", "hinglish"}:
                parts.append(f"{item} par {amount} rupaye")
            else:
                parts.append(f"{item} for {amount} rupees")

        joined = ", ".join(parts)
        if style == "hindi":
            variants = [
                f"ठीक है, खर्च नोट कर लिया: {joined}. कुल खर्च {_safe_number(total_expense)} रुपये।",
                f"समझ गया, खर्च एंट्री कर दी: {joined}. कुल खर्च {_safe_number(total_expense)} रुपये।",
                f"नोट हो गया: {joined}. अभी तक कुल खर्च {_safe_number(total_expense)} रुपये है।",
            ]
            return _pick_variant(transcript, variants)
        if style == "hinglish":
            variants = [
                f"Theek hai, expense note kar liya: {joined}. Total expense {_safe_number(total_expense)} rupaye.",
                f"Done, expense entry save kar di: {joined}. Total expense {_safe_number(total_expense)} rupaye.",
                f"Samjha, yeh kharcha record ho gaya: {joined}. Abhi total expense {_safe_number(total_expense)} rupaye hai.",
            ]
            return _pick_variant(transcript, variants)
        return f"Okay, noted expense: {joined}. Total expense is {_safe_number(total_expense)} rupees."

    return transcript.strip()


def _build_llm_payload(transcript: str, structured_data: Optional[Dict[str, Any]]) -> Tuple[str, str]:
    style = _detect_language_style(transcript)
    style_instruction = {
        "hindi": "Hindi",
        "hinglish": "Hinglish",
        "english": "English",
    }.get(style, "Hinglish")

    system_prompt = (
        "You are a voice transaction assistant for small business owners in India. "
        "You must produce short, natural, speech-friendly replies that are warm and professional. "
        "Never invent numeric values. Use only the provided structured fields."
    )

    user_prompt = (
        f"Language style: {style_instruction}\n"
        f"Original transcript: {transcript.strip()}\n"
        f"Structured transaction JSON: {json.dumps(structured_data or {}, ensure_ascii=False)}\n"
        "Task:\n"
        "1) If needs_clarification=true, ask one precise follow-up question.\n"
        "2) If transaction is complete, acknowledge with item/qty/amount summary.\n"
        "3) Keep response under 28 words.\n"
        "4) Speak naturally like a real assistant, not robotic.\n"
        "Return only final reply text."
    )
    return system_prompt, user_prompt


def _generate_openai_grounded_reply(transcript: str, structured_data: Optional[Dict[str, Any]]) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None

    system_prompt, user_prompt = _build_llm_payload(
        transcript, structured_data)
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": OPENAI_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        base_url = OPENAI_BASE_URL.rstrip("/")
        response = requests.post(
            f"{base_url}/chat/completions", headers=headers, json=body, timeout=12)
        if response.status_code >= 400:
            logger.warning("OpenAI grounded reply failed (%s): %s",
                           response.status_code, response.text)
            return None

        content = (
            (response.json() or {})
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        reply = str(content or "").strip()
        return reply or None
    except Exception as exc:
        logger.warning("OpenAI grounded reply unavailable: %s", exc)
        return None


def _build_llm_message(transcript: str, structured_data: Optional[Dict[str, Any]]) -> str:
    sales = (structured_data or {}).get("sales") or []
    expenses = (structured_data or {}).get("expenses") or []
    meta = (structured_data or {}).get("meta") or {}

    formatted_sales = [
        f"- item={sale.get('item')}, qty={sale.get('qty')}, price_per_unit={sale.get('price')}"
        for sale in sales
    ]
    formatted_expenses = [
        f"- item={expense.get('item')}, amount={expense.get('amount')}"
        for expense in expenses
    ]

    lines = [
        "The following message came from a voice-recorded business transaction.",
        f"Original transcript: {transcript.strip()}",
        "Use the parsed transaction data as the source of truth whenever it is available.",
        "Do not swap quantity and price.",
        "Do not invent or normalize numbers beyond the parsed fields.",
    ]

    if formatted_sales:
        lines.append("Parsed sales:")
        lines.extend(formatted_sales)
    if formatted_expenses:
        lines.append("Parsed expenses:")
        lines.extend(formatted_expenses)

    if meta.get("needs_clarification"):
        question = str(meta.get("clarification_question") or "").strip()
        lines.append("A clarification is still needed.")
        if question:
            lines.append(f"Ask this follow-up naturally: {question}")
    else:
        lines.append("The transaction appears complete.")
        lines.append(
            "Reply with a short natural acknowledgment confirming exactly what was understood from the parsed fields.")
        lines.append(
            "For sales, mention the quantity first and the per-unit price second only if needed.")
        lines.append(
            'Example style: "Theek hai, 2 chai 4 rupaye ki note kar li."')

    lines.append(
        "Reply in the same language as the user. Keep it concise and voice-friendly.")
    return "\n".join(lines)


def _build_clarification_reply_with_context(
    user_id: str,
    transcript: str,
    structured_data: Optional[Dict[str, Any]],
) -> str:
    meta = (structured_data or {}).get("meta") or {}
    question = str(meta.get("clarification_question") or "").strip()
    pending_state = get_pending_conversation(user_id)
    previous_question = str((pending_state or {}).get(
        "clarification_question") or "").strip()

    if question:
        if previous_question and _questions_are_similar(question, previous_question):
            return _build_progressive_clarification_question(transcript, structured_data, pending_state)
        return question

    llm_reply = _generate_openai_grounded_reply(transcript, structured_data)
    if llm_reply:
        return llm_reply

    return _build_progressive_clarification_question(transcript, structured_data, pending_state)


def generate_assistant_reply(
    user_id: str,
    transcript: str,
    structured_data: Optional[Dict[str, Any]] = None,
    stt_provider: str = "sarvam",
    mode: str = "auto",
) -> str:
    cleaned_user_id = str(user_id or "").strip()
    cleaned_transcript = str(transcript or "").strip()

    if not cleaned_user_id:
        raise ValueError("user_id is required for assistant reply generation.")
    if not cleaned_transcript:
        raise ValueError(
            "transcript is required for assistant reply generation.")

    if isinstance(structured_data, dict):
        meta = structured_data.get("meta") or {}
        if meta.get("needs_clarification"):
            return _build_clarification_reply_with_context(cleaned_user_id, cleaned_transcript, structured_data)

    if _has_finalized_transaction(structured_data):
        llm_reply = _generate_openai_grounded_reply(
            cleaned_transcript, structured_data)
        if llm_reply:
            return llm_reply
        return _build_grounded_reply(cleaned_transcript, structured_data)

    agent_mode = mode == "agent" or mode == "auto"
    if agent_mode:
        llm_agent_reply = _generate_openai_agent_reply(
            cleaned_user_id, cleaned_transcript)
        if llm_agent_reply:
            return llm_agent_reply

        backend_assistant_reply = _query_backend_assistant(
            cleaned_user_id, cleaned_transcript)
        if backend_assistant_reply:
            return backend_assistant_reply

        backend_chat_reply = _query_backend_chat(
            cleaned_user_id, cleaned_transcript, stt_provider)
        if backend_chat_reply:
            return backend_chat_reply

        style = _detect_language_style(cleaned_transcript)
        if style == "hindi":
            return "Maine aapka sawaal samjha. Mere paas abhi exact data limited hai, lekin main aapke recent records ke basis par help kar sakta hoon."
        if style == "hinglish":
            return "Maine aapka question samjha. Exact data abhi limited hai, but main aapke recent records ke basis par guide kar sakta hoon."
        return "I understood your question. Exact data is limited right now, but I can still guide you based on your recent records."

    # Last fallback: only query backend chat when parsed transaction data is unavailable.
    llm_transaction_message = _build_llm_message(cleaned_transcript, structured_data)
    logger.info("Forwarding transaction-aware reply generation to backend chat")
    backend_reply = _query_backend_chat(
        cleaned_user_id, llm_transaction_message, stt_provider)

    if backend_reply:
        return backend_reply

    raise RuntimeError("Backend chat returned an empty reply")
