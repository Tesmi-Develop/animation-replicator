# 🚶‍♂️ Animation-replicator

<div align="center">

[![ISC License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@rbxts/animation-replicator)](https://www.npmjs.com/package/@rbxts/animation-replicator)

<div align="left">

A powerful Roblox library designed for **efficient animation replication and synchronization between the server and client**. Library provides automatic, type-safe animation state synchronization.

## ✨ Features

* 🔄 **Automatic Animation State Synchronization**: The server controls animation state, and the client automatically plays them.
* 🏷️ **Type-Safe**: Full TypeScript support for all animation data and their states.
* 🎮 **Easy to Use**: An intuitive API for quick integration into your projects.

## 📦 Installation
```bash
npm install @rbxts/animation-replicator
```

## 🚀 Getting Started

Replicator uses a "server-tracker" and "client-renderer" concept, where the server defines the animation state, and the client is responsible for its visual playback, automatically reacting to state changes.

### 1️⃣ Server implementation

On the server, ServerAnimator is responsible for loading animations, managing their state, and tracking progress. It automatically publishes state changes to a shared Atom accessible by clients.

```ts
import { Atom, atom } from "@rbxts/charm";
import { ServerAnimator } from "@rbxts/animation-replicator";
import { AnimationData } from "@rbxts/animation-replicator";

// Create a shared "atom" (state) that will be synchronized
// Notes: For atom synchronization, see charm library
const characterAnimationsAtom = atom(new Map<string, AnimationData>());

// Initialize the server animation manager
const serverAnimator = new ServerAnimator(characterAnimationsAtom);

// Example usage: loading and starting an animation
export async function setupCharacterAnimations(character: Model) {
    const animation = new Instance("Animation");
    animation.AnimationId = "rbxassetid://0"; // Replace with your AnimationId
    animation.Name = "IdleAnimation";
    animation.Parent = character; // Or wherever client can find the animation

    // Load the animation, get its tracker
    const idleTracker = await serverAnimator.LoadAnimation(animation);

    // Example: start the animation after 5 seconds
    task.delay(5, () => {
        idleTracker.Play(0.1, 1, 1); // Play at fade 0.2, weight 1, speed 1
        print("Server: Playing Idle Animation!");
    });

    // Example: stop after 10 seconds
    task.delay(10, () => {
        idleTracker.Stop(0.5); // Stop with fade 0.5
        print("Server: Stopping Idle Animation!");
    });
}
```

### 2️⃣ Client implementation

On the client, ClientAnimator observes changes in the shared Atom and plays the corresponding animations locally.

```ts
import { Atom, atom } from "@rbxts/charm";
import { ClientAnimator } from "@rbxts/animation-replicator";
import { AnimationData } from "@rbxts/animation-replicator";

// Assume this atom will be synchronized with the server
// via a RemoteFunction or another system that passes the shared state
const characterAnimationsAtom = atom(new Map<string, AnimationData>());

// Get your Character's Animator
const localPlayer = game.GetService("Players").LocalPlayer;
const character = localPlayer.Character ?? localPlayer.CharacterAdded.Wait();
const animator = character.FindFirstChildOfClass("Animator");
if (!animator) error("Animator not found on character!");

// Initialize the client animation manager
const clientAnimator = new ClientAnimator(animator, characterAnimationsAtom);

// Start observing animations
clientAnimator.Start();

// !!! IMPORTANT: You need to ensure that `characterAnimationsAtom`
// on the client is updated with data from the server.
// (This part is outside the scope of this library and depends on your architecture.)

// Example: if the server changes the state of "IdleAnimation",
// the client will automatically play or stop it.
```

## 📚 API Reference
``ServerAnimator``

Responsible for server-side logic and animation state synchronization.

- ``constructor(atom: Atom<Map<string, AnimationData>>)``
  - ``atom``: The shared ``Atom`` with the animation map, which will be synchronized with clients.
  - Loads an animation and returns an ``AnimationTracker`` to manage it.
- ``Destroy(): void``
	- Cleans up all active ``AnimationTracker`` instances and their subscriptions.

---
``AnimationTracker`` **(Server-Side)**

Manages the state of a single animation on the server.

- ``constructor(initialData: AnimationData)``
- ``Atom: Atom<AnimationState | undefined>``: The internal ``Atom`` for this specific animation's state.
- ``Play(speed?: number, fadeTime?: number): void``
	- Starts playing the animation.
- ``Stop(fadeTime?: number): void``
	- Stops playing the animation.
- ``SetSpeed(speed: number): void``
	- Sets the playback speed.
- ``SetWeight(weight: number): void``
	- Sets the animation's weight.
- ``Destroy(): void``
	- Cleans up the tracker's internal state and subscriptions.

---
``ClientAnimator``
Responsible for client-side logic and animation rendering.

- ``constructor(animator: Animator, atom: Atom<Map<string, AnimationData>>)``
	- ``animator``: Animator instance.
	- ``atom``: The shared atom with the animation map, replicated from the server.
- ``Start(): void``
	- Begins observing the atom for animation rendering.
- ``Destroy(): void``
	- Stops observation and cleans up resources.

---
``AnimationRender`` **(Client-Side)**
An internal class of ``ClientAnimator`` responsible for the actual playback of an ``AnimationTrack`` on the client.

- ``constructor(atom: Atom<AnimationState>, config: AnimationConfig, animator: Animator)``
- ``Destroy(): void``
	- Stops and cleans up the AnimationRender.

---
<p align="center">
shared-components-flamework is released under the <a href="LICENSE.md">MIT License</a>.
</p>

<div align="center">

[![MIT License](https://img.shields.io/github/license/Tesmi-Develop/animation-replicator?style=for-the-badge)](LICENSE.md)
