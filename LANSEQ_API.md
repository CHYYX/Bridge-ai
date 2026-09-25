# Lanseq API — provider integration

Lanseq is a multi-model inference infrastructure provider for open-weight models.

Production API:

`https://api.lanseq.cloud/v1`

API reference:

`https://api.lanseq.cloud/docs`

## Access

Lanseq uses controlled credential provisioning for provider, gateway, agent, and platform integrations. There is no public self-service key portal.

Approved integrations receive an independent bearer credential through a private delivery channel. Credentials can be scoped, rotated, and revoked independently.

Do not post API keys, private prompts, or customer data in public issues.

## Model capacity

Lanseq is not a single-model provider. Model capacity is provisioned and adjusted against production workload requirements, routing demand, and integration needs.

`qwen3.8-27b-int4` is the initial qualification SKU used for the first public provider integrations. It is not the limit of the Lanseq model catalog or deployment capability.

Use an authenticated `GET /v1/models` request to discover the model IDs provisioned for a specific integration.

## Interface

Lanseq exposes an OpenAI-compatible interface.

- Authentication: `Authorization: Bearer <LANSEQ_API_KEY>`
- Models: `GET /v1/models`
- Chat completions: `POST /v1/chat/completions`
- Streaming: SSE
- Tool calling: supported on qualified models
- Structured output / JSON schema: supported on qualified models
- Reasoning output: supported on qualified models

Capabilities can vary by model. Integrations should rely on the capability metadata and qualification results for the model being provisioned.

## Qualification

The Lanseq provider qualification path has been exercised through OpenCode, Hermes-compatible workflows, and the production public API, including authenticated model discovery, normal chat completion, streaming with final usage accounting, tool calling, reasoning control, and JSON-schema structured output.

Production partners can be issued a dedicated evaluation credential for independent qualification and canary traffic before production routing.

## Data use

Lanseq does not use inference content to train models.

Operational metadata may be processed for service delivery, reliability, security, abuse prevention, capacity management, billing, settlement, and applicable compliance obligations.

## Integration surface

Company / provider surface:

`https://lanseq.cloud`

Production API:

`https://api.lanseq.cloud/v1`

API reference:

`https://api.lanseq.cloud/docs`

Integration access:

`https://lanseq.cloud/access`

Privacy & Data Policy:

`https://lanseq.cloud/privacy`

Terms of Service:

`https://lanseq.cloud/terms`
