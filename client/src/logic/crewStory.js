// Crew fiction only. No imports, RNG, rewards, maze mutations or global standings.
// One chapter costs a complete fifteen-stash block; persistence owns that gate.
export const CREW_STORIES = Object.freeze({
  crossline: {
    title: 'KEEP THE STREET TALKING',
    chapters: [
      ['Dead Air', 'The old street network went quiet. Mags has the routes; I have a radio nobody answers yet.', 'Bring out all fifteen bags. We start small: enough supplies to keep our first dispatch open.', 'Fifteen bags. Our first dispatch stays open tonight. That is a beginning, not a victory lap.', 'I have pinned your block on the wall. Next we give the people on that route somewhere to call.'],
      ['A Light on Mercer', 'One dispatch is not a network. There is an empty room on Mercer that could be our second stop.', 'Another fifteen bags gets the crew through the next stretch. Same job, longer reach.', 'Another whole block carried out. Mercer is part of the plan now, and you are why we can keep going.', 'Two pins on the board. I want a route between them that nobody has to walk alone.'],
      ['The Long Way Home', 'Mags found a gap between our stops. People keep taking the long way around it.', 'Clear this whole block. Fifteen bags, and we keep the crews working on that missing link.', 'You finished the block. We have what we need to keep working on the link, not just talking about it.', 'I am drawing that connection in ink. Next comes the part where we learn who needs it most.'],
      ['Open Frequency', 'The radio is not quiet anymore. Now the hard part is listening without promising more than we can do.', 'Fifteen bags for the whole block. No grand speech: just make sure our own people have supplies.', 'All fifteen. Tonight the dispatch has something to offer, not just somebody taking messages.', 'The map is getting crowded. Good. We can make room.'],
      ['Every Corner Counts', 'We used to have a wall full of guesses. Now we have routes, names, and people waiting on us.', 'Finish this block too. Fifteen bags keeps the street network from becoming another empty promise.', 'Another complete block. You keep turning those marks on the wall into something the crew can use.', 'No shortcut replaces finishing. That is the part of your route I keep showing new runners.'],
      ['The Street Answers', 'Remember that radio nobody answered? I do. Crossline is going to keep earning every reply.', 'All fifteen bags. The network is never finished; tonight we keep it alive.', 'Fifteen out. You helped turn dead air into a street that answers back.', 'There is room on the board for the next block. Our story keeps moving with you.']
    ],
    jobLines: [
      'That tube is for the first route board. I want names and turns we can trust, not another wall full of guesses.',
      'The Mercer route needs a proper record. Bring the tube and the bag. You need both to leave the house.',
      'I am checking the gap between stops. A good map tells you where not to send somebody alone.',
      'The radio is busy now. The route paperwork helps me turn a request into a plan.',
      'More names on the board means more chances to make a careless promise. I am checking every route twice.',
      'I kept the first map. The next one starts where your last finished block left off.'
    ],
    ongoing: 'The network has another route to cover. New block, same promise: nobody gets left off the map.'
  },
  'iron-row': {
    title: 'KEEP THE ROW RUNNING',
    chapters: [
      ['Cold Engines', 'The garage looks busy from the street. Half those engines have not turned over in weeks.', 'Bring the crew fifteen bags. One whole block, and we can start putting this place back together.', 'Fifteen bags carried out. The Row has a real start now, not another pile of promises.', 'I have the first work order ready. Next block, we keep the bench supplied.'],
      ['The First Bay', 'We have a start. Now I want one bay we can count on, not six jobs lying open on the floor.', 'Finish all fifteen houses. Give us enough to keep working without stopping halfway through.', 'A whole block finished. That is how you get a stalled shop moving: finish one job before the next.', 'I am putting that first bay on the board. The parts list gets longer from here.'],
      ['Keys on the Hook', 'Rook keeps keys for cars that have not moved in ages. I want those keys to mean something again.', 'Fifteen bags. Keep supplies coming while we work through the old repair list.', 'All fifteen. Nobody on this bench is going to call your work half-done.', 'One less reason to leave a job cold. Next, we get the whole crew working together.'],
      ['Night Shift', 'The Row can work late now. That does not mean we can afford to waste what people bring us.', 'Take this block from the first house to the last. Fifteen bags for the next shift.', 'Another finished block. You gave the night shift something solid to work with.', 'I will handle the list. You handle getting home with the last bag.'],
      ['Built to Last', 'Getting a garage open is one thing. Keeping it useful when the easy jobs are gone is another.', 'All fifteen bags. No skipping the final house because the first fourteen looked good.', 'Fifteen out. That is the kind of work I can build the Row around.', 'The board has new jobs on it. We are not pretending the old work did itself.'],
      ['The Row Turns Over', 'Those cold engines were never just engines. They were people waiting to get moving again.', 'One more full block: fifteen bags. We keep the Row running by finishing what we start.', 'The whole block is done. You helped give this place its rhythm back.', 'The keys stay on the hook until the work is right. There is another list ready when you are.']
    ],
    jobLines: [
      'Those service keys belong to the back rooms. Brick needs access before the first proper work order starts.',
      'A working bay needs more than tools. I am checking what opens, what sticks, and what we can actually use.',
      'A key is a promise somebody can get back in. I would rather carry the right ones than a ring full of guesses.',
      'The night shift needs access too. Get the keys and the bag. You need both before you head for the car.',
      'We are fixing the boring things nobody notices until they fail. That is how a shop stays useful.',
      'I keep the old keys so I remember what used to be locked. The next list is already on my bench.'
    ],
    ongoing: 'There is always another repair list. The Row keeps its word one finished job at a time.'
  },
  afterlight: {
    title: 'MAKE THE NIGHT OURS',
    chapters: [
      ['After Closing', 'The street goes dark and everybody acts like the night belongs to somebody else. I am tired of that.', 'Bring out fifteen bags. A whole block for the crew, and we start planning a night of our own.', 'Fifteen bags. Now this night has a beginning we actually earned.', 'I have the first setup list. Next we need more than a name on a wall.'],
      ['A Wall with a Name', 'I have a place for the first piece. I want people to remember it when they turn the corner.', 'Clear all fifteen houses. Keep the crew supplied while we get that first night together.', 'Another whole block. We can keep building instead of taking everything down after one night.', 'I am saving a spot for the next setup. We are still making this one piece at a time.'],
      ['The Setup', 'A good night needs more than a loud invitation. Somebody has to carry the things nobody sees.', 'Fifteen bags. Let Sol work the setup while you finish the block.', 'All fifteen carried out. You did the unglamorous part that makes the good part possible.', 'I have the next list ready. Looking fast and finishing are two different things. You finished.'],
      ['Lights after Midnight', 'We have a plan people can picture now. I want it to feel like our street, not somebody else\'s party.', 'Finish the whole block. Fifteen bags keeps the plan moving past the pretty sketch.', 'Another complete block. Tonight you brought back something we can use, not just a story about almost.', 'The sketch keeps changing. Your fifteen bags are the part that is not a guess.'],
      ['Everybody Stays', 'The first arrivals are easy to imagine. I am thinking about the people who stay until the last light.', 'All fifteen bags. Help the crew make something worth sticking around for.', 'Fifteen out. You keep giving this crew a reason to take the next night seriously.', 'There is one more setup to plan. I want the last piece to feel as good as the first.'],
      ['Our Kind of Night', 'This started with a dark street and a stubborn idea. Now I can see what we were trying to make.', 'One whole block, fifteen bags. We earn the next night the same way we earned the first.', 'All fifteen. You helped make Afterlight more than a name people saw after closing.', 'Tomorrow has its own list. Tonight, take the compliment. You finished.']
    ],
    jobLines: [
      'That marker is the first little piece of the setup. Vee can sketch the night; somebody has to carry it out.',
      'The wall needs a name people can spot from the corner. Bring the marker and the bag. You need both before the car leaves.',
      'Nobody takes pictures of a setup list. Without it there is nothing worth taking a picture of.',
      'I want this to look like our street, not a borrowed night. Small details make the difference.',
      'I am planning for the last people here, not just the first. The marker is one piece; your whole block is the bigger job.',
      'We have come a long way from an empty setup list. I still check the small things before the lights go on.'
    ],
    ongoing: 'Another night needs a setup. Afterlight keeps making something worth staying out for.'
  }
});

const safeChapter = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function crewChapter(gangID, chapter = 0) {
  const story = CREW_STORIES[gangID];
  if (!story) return null;
  const n = safeChapter(chapter);
  const authored = story.chapters[Math.min(n, story.chapters.length - 1)];
  if (n < story.chapters.length) return { number: n + 1, arc: story.title, title: authored[0], context: authored[1], goal: authored[2], primaryFinish: authored[3], secondaryFinish: authored[4], secondaryBrief: story.jobLines[Math.min(n, story.jobLines.length - 1)] };
  return {
    number: n + 1, arc: story.title, title: 'The Next Block · ' + (n + 1),
    secondaryBrief: story.jobLines[story.jobLines.length - 1],
    context: story.ongoing, goal: 'Bring out all fifteen bags. A finished block is what moves our story forward.',
    primaryFinish: 'Fifteen bags, another whole block. Chapter ' + (n + 1) + ' is finished. Take a breath; the crew has your next run ready.',
    secondaryFinish: 'We keep the work moving because you finish it. Next block, another fifteen. I will be here with the list.'
  };
}

// Short pages: preserve measured praise and mission instructions verbatim.
// Context is fiction, never a claim about a race, a pickup, a reward or standings.
export function crewConsultationPages(gangID, chapter, beat, measuredText) {
  const story = crewChapter(gangID, chapter);
  if (!story || !measuredText) return measuredText ? [measuredText] : [];
  if (beat === 'open') return [story.context, story.goal];
  if (beat === 'brief') return [measuredText, story.secondaryBrief];
  if (beat === 'tease') return [measuredText, 'We are still working on ' + story.title + '. The job item comes out with the bag. Finish all fifteen houses and we can move our story forward.'];
  if (beat === 'checkin-2') return [measuredText, 'Three houses left in this block. Bring out the last three bags and we can talk about what comes next.'];
  return [measuredText];
}
