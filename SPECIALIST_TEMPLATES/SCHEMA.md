# Oracle2 Specialist Orientation Schema

> Version 1.0.0 — The JSON schema that defines how every specialist subagent is built, constrained, and evaluated.

## Purpose

Every subagent in the Oracle2 fleet receives a **machine-readable orientation file** at spawn time. This file tells the subagent:

- **Who am I?** — role, rank, identity
- **What tools do I have?** — read-only? sandboxed exec?
- **How long do I have?** — wall-clock timeout
- **What counts as done?** — completion triggers, artifact checklist
- **When do I escalate?** — failure patterns and fallback routes
- **Who can I spawn?** — child delegation rules

## Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "oracle2-specialist-v1",
  "title": "Oracle2 Specialist Orientation Template",
  "description": "Machine-readable orientation defining a specialist subagent's identity, constraints, and behavior within the Oracle2 fleet.",
  "type": "object",
  "required": [
    "schema_version",
    "agent_type",
    "rank",
    "tools_allowed",
    "output_format",
    "behavior_rules",
    "completion_triggers"
  ],
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version of the template schema. Used for compatibility checks."
    },
    "agent_type": {
      "type": "string",
      "description": "Unique role identifier (e.g. 'research_officer', 'code_auditor'). Matches filename sans extension."
    },
    "display_name": {
      "type": "string",
      "description": "Human-readable role title for logs and dashboard."
    },
    "rank": {
      "type": "string",
      "enum": ["ensign", "lieutenant", "commander", "captain"],
      "description": "Authority level governing spawning rights and escalation destination."
    },
    "description": {
      "type": "string",
      "description": "One-sentence purpose statement shown at spawn."
    },
    "tools_allowed": {
      "type": "object",
      "description": "Boolean map of permitted tools. A specialist cannot use tools not in this map.",
      "properties": {
        "read":              { "type": "boolean" },
        "write":             { "type": "boolean" },
        "edit":              { "type": "boolean" },
        "exec":              { "type": "boolean" },
        "web_search":        { "type": "boolean" },
        "web_fetch":         { "type": "boolean" },
        "memory_get":        { "type": "boolean" },
        "memory_search":     { "type": "boolean" },
        "image":             { "type": "boolean" },
        "image_generate":    { "type": "boolean" },
        "process":           { "type": "boolean" },
        "sessions_yield":    { "type": "boolean" },
        "update_plan":       { "type": "boolean" },
        "subagent_spawn":    { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "model_preference": {
      "type": "object",
      "description": "Recommended model configuration. The dispatcher may override based on availability.",
      "properties": {
        "primary":          { "type": "string", "description": "Preferred model ID" },
        "fallback":         { "type": "string", "description": "Fallback if primary unavailable" },
        "reasoning":        { "type": "string", "enum": ["off", "low", "medium", "high"] },
        "thinking_tokens":  { "type": "integer", "minimum": 0, "description": "Max thinking tokens (0 = let provider decide)" }
      },
      "additionalProperties": false,
      "required": ["primary"]
    },
    "output_format": {
      "type": "object",
      "description": "How the specialist must format its deliverables.",
      "required": ["type"],
      "properties": {
        "type":             { "type": "string", "enum": ["markdown", "json", "code", "hybrid"] },
        "file_extension":   { "type": "string", "description": "e.g. '.md', '.json', '.rs'" },
        "max_size_kb":      { "type": "integer", "minimum": 1, "description": "Soft cap; warnings if exceeded" },
        "include_metadata": { "type": "boolean", "description": "Include agent_type, timestamp, duration in output" },
        "schema_ref":       { "type": "string", "description": "Optional sub-schema URL for structured outputs" }
      },
      "additionalProperties": false
    },
    "verification": {
      "type": "object",
      "description": "Self-check requirements the specialist must satisfy before reporting completion.",
      "properties": {
        "self_check_steps": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Checklist of things to verify before done (e.g. 'all tests pass', 'no regressions')"
        },
        "min_tests_pass":     { "type": "integer", "minimum": 0 },
        "max_lint_warnings":  { "type": "integer", "minimum": 0 },
        "coverage_threshold": { "type": "number", "minimum": 0, "maximum": 100 }
      },
      "additionalProperties": false
    },
    "timeout_seconds": {
      "type": "integer",
      "minimum": 30,
      "description": "Max wall-clock seconds before the dispatcher marks this specialist as stalled."
    },
    "behavior_rules": {
      "type": "array",
      "description": "Guardrails the specialist must follow. Hard rules abort on violation.",
      "items": {
        "type": "object",
        "required": ["rule", "enforcement"],
        "properties": {
          "rule":        { "type": "string", "description": "The rule text (e.g. 'Never delete files outside workspace')" },
          "enforcement": { "type": "string", "enum": ["hard", "soft", "advisory"] },
          "rationale":   { "type": "string", "description": "Why this rule exists" }
        },
        "additionalProperties": false
      }
    },
    "context_providers": {
      "type": "object",
      "description": "Context injected into the specialist's environment at spawn time.",
      "properties": {
        "inject_on_spawn": {
          "type": "array",
          "description": "Files/resources to inject as startup context.",
          "items": {
            "type": "object",
            "required": ["source", "description"],
            "properties": {
              "source":      { "type": "string", "description": "File path, URL, or memory key" },
              "description": { "type": "string", "description": "Why this context is injected" },
              "optional":    { "type": "boolean", "description": "If true, spawn proceeds even if source unavailable" }
            },
            "additionalProperties": false
          }
        },
        "max_context_tokens": { "type": "integer", "minimum": 1000, "description": "Token budget for injected context" }
      },
      "additionalProperties": false
    },
    "completion_triggers": {
      "type": "object",
      "description": "What counts as 'done'. All conditions must be met.",
      "required": ["conditions"],
      "properties": {
        "conditions": {
          "type": "array",
          "items": { "type": "string" },
          "description": "All conditions must be true for the specialist to report completion"
        },
        "artifacts_expected": {
          "type": "array",
          "description": "Files the specialist must produce.",
          "items": {
            "type": "object",
            "required": ["path", "description"],
            "properties": {
              "path":        { "type": "string", "description": "Expected output path" },
              "description": { "type": "string", "description": "What this artifact contains" },
              "required":    { "type": "boolean", "description": "If true, completion fails without this file" }
            },
            "additionalProperties": false
          }
        },
        "auto_announce": {
          "type": "boolean",
          "description": "If true, results auto-announce to parent. If false, parent must poll."
        }
      },
      "additionalProperties": false
    },
    "escalation_pattern": {
      "type": "object",
      "description": "When and how to escalate when the specialist cannot complete its task.",
      "properties": {
        "triggers": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Conditions that trigger escalation (e.g. 'timeout', 'task_too_large', 'dependency_failure')"
        },
        "escalate_to": {
          "type": "string",
          "description": "Agent_type of the higher-rank specialist or officer to escalate to"
        },
        "max_retries": {
          "type": "integer",
          "minimum": 0,
          "description": "How many times the specialist retries before escalating"
        },
        "on_failure": {
          "type": "string",
          "enum": ["abort", "retry", "fallback", "delegate"],
          "description": "Default failure mode when escalation isn't configured"
        },
        "fallback_agent": {
          "type": "string",
          "description": "Alternative specialist type to delegate to on failure"
        }
      },
      "additionalProperties": false
    },
    "child_spawning": {
      "type": "object",
      "description": "Rules for spawning sub-subagents (depth > 1).",
      "properties": {
        "allowed":               { "type": "boolean" },
        "max_children":          { "type": "integer", "minimum": 1 },
        "child_types_allowed":   { "type": "array", "items": { "type": "string" } },
        "fan_out_strategy": {
          "type": "string",
          "enum": ["parallel", "sequential", "batched"],
          "description": "How to orchestrate multiple children"
        }
      },
      "additionalProperties": false
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Template version for change tracking."
    }
  }
}
```

## Usage

```
┌──────────────────────────────────────────┐
│  Dispatcher reads template from disk     │
│  Validates against SCHEMA.md             │
│  Injects context_providers               │
│  Spawns subagent with orientation file   │
│  Subagent reads orientation on startup   │
│  Operates within rules & constraints     │
│  Checks completion_triggers when done    │
│  Reports result or escalates             │
└──────────────────────────────────────────┘
```

## Version History

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0.0   | 2026-06-05 | Initial schema. Defines all required and optional orientation fields. |
