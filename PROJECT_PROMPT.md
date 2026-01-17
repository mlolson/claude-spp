# Claude learner mode plugin

## Background

A big problem for programmers using claude and other LLMs is competency rot. When we hand off programming to the LLM, we lose the ability to do things. We also lose context on the project and don't have a good understanding of the design choices that have been made. Although we should be reviewing the code that claude writes, the tendency is to just accept everything without reviewing it.

This situation is not tenable over the long term. As the human programmer loses skills, our ability to effectively manage the LLM degrades.

## Solution

To fix this, I want to create a plugin for claude called "learner-mode". In this mode, claude should make it a primary goal to teach the human programmer, and keep his or her skills sharp. Some ideas for learner mode:

* Claude should create coding tasks for the human to complete. These should include core system components, and features.

* The user should be able to choose what to work on, but claude should make sure the user is doing ~25% of the coding work at least.

* Claude should ask the user questions to sharpen their skills. If the user asks something that can be easily researched themselves, suggest that they do so themselves. Point to resources and documentation rather than providing the answer directly.

* The user should not be able to bypass learner mode, unless they disable it.


## Your task

* Write a plan to an md file in this directory.

* Include features above, feel free to propose other ideas for how you think you could sharpen human skills.

* Include an implementation plan.

* Do not start writing code until instructed.




