import json
import os
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException
from openai import OpenAI

from db import get_user_by_account_token, save_permit_request
from models import PermitExceptionRequest, PermitExceptionResponse, EndSessionEarlyRequest, EndSessionEarlyResponse

load_dotenv()

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_account_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    return authorization[len(prefix):].strip()


@router.post("/permit-exception", response_model=PermitExceptionResponse)
def permit_exception(
    data: PermitExceptionRequest,
    authorization: str | None = Header(default=None),
):
    account_token = extract_account_token(authorization)
    user = get_user_by_account_token(account_token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid account token")

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    prompt = f"""
You are a strict productivity gatekeeper for a focus app called Warden.

The user is asking for an exception to access a website.

Goal:
{data.goal}

Website:
{data.website}

Reason:
{data.reason}

Return valid JSON only in this exact format:
{{
  "decision": "ALLOW" or "DENY",
  "explanation": "short explanation"
}}

Rules:
- ALLOW only if the website clearly helps the stated goal.
- DENY if the request seems like distraction, entertainment, avoidance, or weak justification.
- Be strict.
"""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        raw_text = response.output_text.strip()
        parsed = json.loads(raw_text)

        decision = str(parsed.get("decision", "DENY")).upper()
        explanation = str(parsed.get("explanation", "No explanation provided."))

        if decision not in {"ALLOW", "DENY"}:
            decision = "DENY"

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI request failed: {str(e)}")

    save_permit_request(
        user_id=user["id"],
        goal=data.goal,
        website=data.website,
        reason=data.reason,
        decision=decision,
        explanation=explanation,
    )

    return PermitExceptionResponse(
        decision=decision,
        explanation=explanation,
    )


@router.post("/end-session-early", response_model=EndSessionEarlyResponse)
def end_session_early(
    data: EndSessionEarlyRequest,
    authorization: str | None = Header(default=None),
):
    account_token = extract_account_token(authorization)
    user = get_user_by_account_token(account_token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid account token")

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    prompt = f"""
You are a strict accountability judge for a focus app called Warden.

A user wants to end their lockdown session early by claiming they have completed their goal.

Goal:
{data.goal}

Their proof of completion:
{data.proof}

Return valid JSON only in this exact format:
{{
  "decision": "ALLOW" or "DENY",
  "explanation": "short explanation"
}}

Rules:
- ALLOW only if the proof convincingly demonstrates the goal was completed or is no longer needed.
- DENY if the proof is vague, unrelated, or sounds like an excuse to stop working.
- Be strict. Vague answers like "I finished" or "I'm done" without specifics should be DENIED.
"""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        raw_text = response.output_text.strip()
        parsed = json.loads(raw_text)

        decision = str(parsed.get("decision", "DENY")).upper()
        explanation = str(parsed.get("explanation", "No explanation provided."))

        if decision not in {"ALLOW", "DENY"}:
            decision = "DENY"

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI request failed: {str(e)}")

    return EndSessionEarlyResponse(
        decision=decision,
        explanation=explanation,
    )