# Tutor Lesson Model → Agent Prompt/Response Loop

**Source:** forgestorm-archive/research/PLATO-BOOT-CAMP.md, Casey's insight 2026-06-06

## The Core Insight

Original PLATO Tutor lessons were individual units that merged:
- **Data** (the lesson content)
- **Vector embeddings** (conceptual relationships between lessons)
- **Prompt** (what the computer showed the human → in our context: what we show the agent)
- **Response** (what the human typed → in our context: what the model generates)

This fell out of favor when PCs won with the file system model. But **the file system is the substrate, not the operating system.** The Tutor model is the OS on top.

## In Our Context

```
Tutor Lesson = prompt_template + expected_response + validation + progression
Agent Loop  = prompt + model_response + confidence_check + next_action
```

Every mining operation IS a lesson:
- Source file = the lesson's data
- Agent reads it = the prompt
- Agent writes summary = the response  
- Confidence check = the validation
- Cross-pollination target = the next action

## Applied To

| Repo | How Tutor Applies |
|------|-------------------|
| **pincher** | Reflex engine = lessons. Teach → Match → Execute. The reflex is the learned response. |
| **cocapn** | Tile learning = lessons. Q&A → Tile → Room → Flywheel. The flywheel is the progression. |
| **nebula** | Cloudflare Worker as lesson executor. Fast path (high confidence) bypasses slow inference. |
| **PLATO MUD** | The original. Rooms + tiles = the lesson model. |

## Expansion Potential

Build a `tutor-lesson` crate that defines:
```
Lesson { prompt, response, confidence, tags, source, prerequisites, next }
```
One struct that serves as the universal knowledge unit across pincher (reflexes), cocapn (tiles), and memory (cache). Teach any agent this format and it can learn from any other agent's lessons.
