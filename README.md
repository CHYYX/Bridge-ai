# Lanseq

This repository retains the historical `Bridge-ai` name. The current product and brand are **Lanseq**.

## Multi-Model Inference Infrastructure

**Open models. Real-time and batch execution. Workload-aware planning.**

Lanseq builds inference infrastructure around the workload: the model it needs, when results are required, and the cost of completing the work. Our product architecture brings together **Real-time Inference**, **Batch Execution**, and **Preflight Intelligence**.

### Real-time Inference

OpenAI-compatible model access for interactive applications, coding assistants, and agent workflows. Integrations use the capabilities qualified for their selected model, including streaming, tool calling, and structured output where supported.

### Batch Execution

Asynchronous inference for evaluations, dataset processing, extraction, and bulk generation. Batch engagements are scoped around a defined workload, model, completion window, and commercial terms. Availability and capacity are confirmed per integration.

### Preflight Intelligence · In development

Model selection and execution planning before a workload runs. The design goal is to evaluate model suitability, quality requirements, context needs, completion windows, and cost constraints together, then inform the choice of model and execution mode.

Preflight is under development; public APIs and general availability have not been announced.

### A workload-first approach

**Multi-model** describes an architecture in which model supply is qualified against demand. The initial public integration model, `qwen3.8-27b-int4`, is a starting point. Additional model availability is confirmed individually; a product architecture does not imply that every model or execution mode is already available through every integration.

For a partner evaluation, start with a concrete workload: target models, input and output sizes, required capabilities, volume, completion window, and acceptance criteria. These define what should be qualified and how a pilot should be assessed.

### Build with Lanseq

- [Website](https://lanseq.cloud) · [API documentation](https://api.lanseq.cloud/docs) · [Integration access](https://lanseq.cloud/access)
- [AI SDK provider](https://github.com/Lanseqcloud/ai-sdk-provider-lanseq) — real-time integration for the Vercel AI SDK
- [Product architecture](./PRODUCT_ARCHITECTURE.md) — execution modes, planning, and availability boundaries

Production API: `https://api.lanseq.cloud/v1`. Credentials are provisioned through the integration access process.

[Privacy](https://lanseq.cloud/privacy) · [Terms](https://lanseq.cloud/terms) · [X](https://x.com/lanseqcloud)
