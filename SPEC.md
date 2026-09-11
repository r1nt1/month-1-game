# SPEC.md — the game

Fill this in yourself, in your own words, before the agent sees it. Every blank is a decision.

## In one sentence

A 3D isometric game composed entirely of blocks of colors. Starts from ambar/orange and progresses towards blue. You start with one block on the center. Then another block slides from the top left towards the centered block. As soon as you press the space bar thee block stops sliding. The parts of the block that don't touch the block below are cut off and fall down. Then the next block comes form the top right, same procedure until you lose when you did not press space bar when having a block below. There's a high score counter on the top right that goes from 1 to the number you reach.

## Screens

Sketch each one. Attach the images or describe layout, copy, and what is tappable.

- **Title:** 
- **Playing:** 
- **Game over:** 
- **Loading:** 
- **Error / unsupported browser:** 

## States and transitions

| From | Trigger | To | What happens |
|---|---|---|---|
| Title | tap / space | Playing | |
| Playing | ... | Game over | |
| Game over | tap "restart" | Playing | |

## The one input

What is it, exactly, on desktop and on a phone? What happens if it is pressed on the wrong screen?

## The score

- What it counts:
- When it changes:
- When it can never change:
- Where it is displayed, and in what type:

## Edge cases

- Window resized mid-game:
- Phone rotated to portrait:
- Tab goes to background and comes back:
- Tap during the title screen fade:
- Restart pressed during the falling animation:

## Must never

- 
- 
- 

## The look

- Palette (hex values): 
- Light: one directional, from where:
- Camera: angle, does it move:
- Three reference images (links or files):
- Motion: what eases, how fast, what is instant:

## Not in scope this month

List things you are tempted by, so the agent knows not to propose them.

- 
