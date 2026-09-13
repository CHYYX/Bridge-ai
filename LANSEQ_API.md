# Lanseq API — access requests and validated integration

Lanseq is an inference provider for open-weight models, with additional model SKUs and capacity being added based on demand. Qwen3.8-27B INT4 is the initial live SKU.

## Access status

The endpoint below is a dedicated OpenCode validation gateway. It is not a generally available, self-service customer API:

`https://opencode.172.98.22.239.sslip.io/v1`

A public customer-access rollout is pending independent credential provisioning and verification. There is no self-service API-key portal or billing dashboard.

## Request API access

Open an [access request in this repository](https://github.com/CHYYX/Bridge-ai/issues) with the title **Lanseq API access request**. Include the model, a brief non-sensitive workload description, and expected usage/concurrency.

Requests are reviewed manually by Lanseq. Submitting a request does not activate access or guarantee availability. Independent customer-key provisioning is not yet operationally verified. An approved customer must receive a separate bearer credential through an agreed private delivery method before using the service. The existing validation credential must not be shared with customers.

Do not post API keys, passwords, private prompts, or customer data in public issues.

## Initial SKU

| Field | Value |
| --- | --- |
| Model ID | `qwen3.8-27b-int4` |
| Display name | Qwen3.8-27B INT4 |
| Underlying model | `alibaba/qwen3.8-27b` |
| Input price | $0.25 per million tokens |
| Cache-read price | $0.045 per million tokens |
| Output price | $1.99 per million tokens |
| Context window | 70,000 tokens |
| Maximum output | 8,192 tokens |
| Input/output modalities | Text only |

Champion capabilities reported by the operator: tool calling, JSON/structured output, and reasoning. Additional models are not listed as live.

## Validated OpenCode integration

The operator's completed validation used OpenCode **1.18.30** and the following configuration. The bearer credential was supplied through an environment variable, not embedded in the JSON.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "lanseq": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Lanseq",
      "options": {
        "baseURL": "https://opencode.172.98.22.239.sslip.io/v1",
        "apiKey": "{env:LANSEQ_OPENCODE_KEY}"
      },
      "models": {
        "qwen3.8-27b-int4": {
          "name": "Qwen3.8-27B INT4",
          "limit": {
            "context": 70000,
            "output": 8192
          }
        }
      }
    }
  }
}
```

Recorded results:
- Unauthenticated `GET /v1/models`: HTTP 401.
- Authenticated `GET /v1/models`: HTTP 200, listing `qwen3.8-27b-int4`.
- OpenCode selected Qwen3.8-27B INT4 / Lanseq and returned executable Python code for a Fibonacci-function task.

These are historical operator-verified results, not a new live test or an uptime/SLA commitment.

## Reasoning controls and remaining verification

The successful OpenCode integration did not test a reasoning request-control field. No support is claimed here for `reasoning_effort`, `enable_thinking`, `thinking`, or a reasoning on/off toggle.

The model's reasoning capability is distinct from caller control of reasoning. Do not infer an API control from that capability or from the successful coding task.

Before general customer access:
- Implement and verify independent bearer credentials, isolation, and revocation.
- Confirm the customer endpoint and credential-delivery process.
- Verify the reasoning controls actually exposed by that endpoint.
- Verify customer-facing usage/cache accounting and billing before charging for usage.

This document does not claim acceptance into models.dev or OpenCode Zen / Go.
