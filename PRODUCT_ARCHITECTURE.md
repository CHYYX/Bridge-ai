# Lanseq product architecture

## Multi-Model Inference Infrastructure

Lanseq organizes open-model inference around three decisions: **which model fits the work, how the work should execute, and what constitutes a successful result**.

The architecture connects Real-time Inference, Batch Execution, and Preflight Intelligence. Each has a distinct role and availability boundary.

## Real-time Inference

Real-time execution serves applications that need a response within an interactive request or agent loop. Lanseq provides an OpenAI-compatible API for these integrations.

Model-specific qualification determines whether streaming, tool calling, structured output, reasoning controls, and usage reporting are supported. Context limits and output limits belong to the individual model deployment.

The published AI SDK provider and proposed third-party conversational integrations connect to this real-time interface.

## Batch Execution

Batch is the asynchronous execution path for work that can be specified in advance and completed within an agreed window. Target workloads include:

- evaluations across prompts or candidate models;
- extraction, classification, and dataset enrichment;
- synthetic-data and bulk-content generation;
- repeatable offline processing for agent and application teams.

The relevant unit of planning is the workload: its model requirements, input and output distribution, expected volume, completion window, and acceptance criteria. A useful pilot measures completion, result quality, and total workload cost against those criteria.

Batch access, supported models, job interfaces, capacity, completion commitments, and pricing are confirmed for each integration. The real-time API documentation alone does not establish a Batch contract. Partners should obtain the applicable Batch interface and terms during onboarding.

## Preflight Intelligence — in development

Preflight is the planning layer being developed to help teams make execution decisions before committing a workload.

Its design scope includes:

| Planning question | Intended inputs |
| --- | --- |
| Which models are suitable? | Task type, quality targets, required capabilities, context needs |
| Which execution mode fits? | Interactive latency needs, asynchronous eligibility, completion window |
| What needs qualification? | Representative inputs, output format, evaluation criteria |
| What are the economic constraints? | Workload size, expected output, cost envelope, capacity requirements |

The intended output is an execution recommendation that can be checked against an integration's actual capabilities and terms. Preflight is not currently documented as a generally available API, an automatic router, or a guarantee of the cheapest model.

## Multi-model by design

Lanseq's model portfolio is demand-driven. Models are qualified for specific workload and integration requirements. The initial public integration model, `qwen3.8-27b-int4`, does not define the long-term product scope.

Multi-model positioning does not imply that a broad catalog is already provisioned for every customer. Use authenticated model discovery and the applicable integration documentation to determine availability. A successful test on one model is not evidence of equivalent behavior on another.

## From workload to evaluation

1. Define the task, target model or model constraints, required capabilities, and representative inputs.
2. Agree on quality criteria, volume, completion requirements, and commercial boundaries.
3. Confirm the available model deployment and execution interface.
4. Run an agreed evaluation and assess the results before expanding scope.

This process makes model choice, execution requirements, and workload economics explicit. Real-time pilots and Batch pilots may have different interfaces and acceptance criteria.

## Integration boundaries

| Surface | Scope |
| --- | --- |
| OpenAI-compatible API | Qualified real-time model access |
| Lanseq AI SDK provider | Real-time text, streaming, tools, and structured output as documented |
| Batch partner integration | Separately confirmed job contract and availability |
| Preflight Intelligence | Development-stage model selection and execution planning |
| Third-party listings and PRs | The implemented adapter and verified model metadata only |

An accepted code contribution does not establish managed routing, production traffic, a commercial relationship, or availability of every Lanseq product component.

## Public resources

- [Website](https://lanseq.cloud)
- [API documentation](https://api.lanseq.cloud/docs)
- [Integration access](https://lanseq.cloud/access)
- [AI SDK provider](https://github.com/Lanseqcloud/ai-sdk-provider-lanseq)
- [Privacy](https://lanseq.cloud/privacy) · [Terms](https://lanseq.cloud/terms)
