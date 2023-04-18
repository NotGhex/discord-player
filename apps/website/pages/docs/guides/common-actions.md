# Common Actions on Player/Queue

Here are few basic examples on how to implement various actions.

This guide assumes that you already initialized the player in your `index.js` or corresponding file.

Also this does not perform checks on the current status of the queue. Refer to one of the [example bots](https://github.com/Androz2091/discord-player/issues/1638) for more detailed info.

## Getting the player instance from anywhere

```js
const { useMasterPlayer } = require("discord-player");
...
const player = useMasterPlayer();
```

## Playing a new track

```js
const { useMasterPlayer } = require("discord-player");
...
const player = useMasterPlayer();
await player.play(interaction.member.voice.channel, query);
```

If you are not using `player.play()` and handling queue creation as well as other logic on your own, you may need to use `AsyncQueue` on your command, otherwise you may face [this issue](https://github.com/Androz2091/discord-player/issues/1717):

```js
const { useMasterPlayer } = require("discord-player");
...
const player = useMasterPlayer();

const queue = player.nodes.create(...);
const result = await player.search(...);

// acquire task entry
const entry = queue.tasksQueue.acquire();

// wait for previous task to be released and our task to be resolved
await entry.getTask();

// add track(s) (this will add playlist or single track from the result)
queue.addTrack(result);

try {
    // if player node was not previously playing, play a song
    if (!queue.isPlaying()) await queue.node.play();
} finally {
    // release the task we acquired to let other tasks to be executed
    // make sure you are releasing your entry, otherwise your bot won't
    // accept new play requests
    queue.tasksQueue.release();
}
```

## Inserting a new track to a specific position in queue

```js
const { useQueue, useMasterPlayer } = require("discord-player");
...
const player = useMasterPlayer();
const queue = useQueue(interaction.guild.id);
const searchResult = await player.search(query, { requestedBy: interaction.user });
queue.insertTrack(searchResult.tracks[0], position); //Remember queue index starts from 0, not 1
```

## Removing a track from the queue

```js
const { useQueue } = require("discord-player");
...
const queue = useQueue(interaction.guild.id);
queue.removeTrack(trackNumber); //Remember queue index starts from 0, not 1
```

## Getting the current queue

```js
const { useQueue } = require("discord-player");
...
const queue = useQueue(interaction.guild.id);
const tracks = queue.tracks.toArray(); //Converts the queue into a array of tracks
const currentTrack = queue.currentTrack; //Gets the current track being played
```

## Pausing the queue

_This example shows how you can toggle the pause state for a queue with a single command_

```js
const { useQueue } = require("discord-player");
...
const queue = useQueue(interaction.guild.id);
queue.node.setPaused(!queue.node.isPaused());//isPaused() returns true if that player is already paused
```

## Going back a track

_If your queue is being looped then there won't be any tracks in history_

```js
const { useHistory } = require("discord-player");
...
const history = useHistory(interaction.guild.id);
await history.previous();
```

## Skipping a track

```js
const { useQueue } = require("discord-player");
...
const queue = useQueue(interaction.guild.id);
queue.node.skip()
```

## Shuffling the queue

```js
const { useQueue } = require("discord-player");
...
const queue = useQueue(interaction.guild.id);
queue.tracks.shuffle();
```

## Looping the queue

_These are the various options for Loop Modes_

| Mode     | Value | Description                                                   |
| -------- | ----- | ------------------------------------------------------------- |
| Off      | 0     | Default mode with no loop active                              |
| Track    | 1     | Loops the current track                                       |
| Queue    | 2     | Loops the current queue                                       |
| Autoplay | 3     | Play related songs automatically based on your existing queue |

```js
const { useQueue } = require("discord-player");
...
const queue = useQueue(interaction.guild.id);
queue.setRepeatMode(mode); //Pass the value for the mode here
```

## Changing the volume of the player

```js
const { useQueue } = require("discord-player");
...
const queue = useQueue(interaction.guild.id);
queue.node.setVolume(volume); //Pass the value for the volume here
```

## Stopping the queue

```js
const { useQueue } = require("discord-player");
...
const queue = useQueue(interaction.guild.id);
queue.delete();
```
