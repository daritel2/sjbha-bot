import { Message, MessageEmbed } from 'discord.js';
import { DateTime, Interval } from 'luxon';
import * as R from 'ramda';

import { MemberList } from '@sjbha/utils/MemberList';
import * as Workout from './Workout';
import * as Exp from './Exp';

const WorkoutCollection = (workouts: Workout.workout[]) => ({
  discordIds:    R.uniq (workouts.map (w => w.discord_id)),
  activityTypes: R.uniq (workouts.map (w => w.activity_type)),
  count:         workouts.length,
  exp:           workouts.map (w => Exp.total (w.exp)).reduce ((a, b) => a + b, 0),

  filterType: (activityType: string) => WorkoutCollection (
    workouts.filter (w => w.activity_type === activityType)
  ),

  filterUser: (discordId: string) => WorkoutCollection (
    workouts.filter (w => w.discord_id === discordId)
  )
});

// Leaders gets all workout types and shows the top 2 EXP earners in each category
export async function leaderboard (message: Message) : Promise<void> {
  const lastThirtyDays = Interval.before (DateTime.local (), { days: 30 });
  const allWorkouts = 
    await Workout
      .find (Workout.during (lastThirtyDays))
      .then (list => list.filter (w => Exp.isHr (w.exp)))
      .then (WorkoutCollection);

  const members = 
    await MemberList.fetch (message.client, allWorkouts.discordIds);

  const embed = 
    new MessageEmbed ({
      color:       0xffd700,
      title:       'Leaders',
      description: 'Top EXP Earners in the last 30 days, per activity',
      footer:      {
        text: '*Only HR activities are considered for leaders'
      }
    });

  for (const activity of allWorkouts.activityTypes) {
    const workouts = allWorkouts.filterType (activity);

    // list of people who have actually recorded an activity of this type
    const leaderboard = workouts.discordIds
      .map (discordId => ({ 
        nickname: members.nickname (discordId), 
        workouts: workouts.filterUser (discordId) 
      }))
      .sort ((a, b) => a.workouts.exp > b.workouts.exp ? -1 : 1);

    const [first, second] = leaderboard;

    let leaders = `🏆 ${first.nickname} • **${first.workouts.exp.toFixed (1)}** exp (${first.workouts.count} workouts)`;

    if (second) {
      leaders += `\n🥈 ${second.nickname} • **${second.workouts.exp.toFixed (1)}** exp (${second.workouts.count} workouts)`;
    }

    embed.addField (activity, leaders);
  }

  message.channel.send ({ embeds: [embed] });
}