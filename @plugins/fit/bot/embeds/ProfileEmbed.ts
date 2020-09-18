import type { DiscordMember } from "@services/bastion";
import type { UserProfile } from "../../domain/user/User";
import type { SummaryDetails, SummaryStats } from "../../domain/strava/ActivitySummary";
import type Activity from "../../domain/strava/Activity";

import {map, isEmpty, always, pipe, join, ifElse, applyTo} from "ramda";
import format from 'string-format';
import {MessageOptions} from "discord.js";

import {toTenths, toRelative} from "./conversions";
import {GenderedEmoji, getEmoji} from "./emoji";
import { asField, field } from "./embed";
import { sortByProp } from "@plugins/fit/fp-utils";

interface ProfileData {
  member: DiscordMember, 
  user: UserProfile,
  activities: SummaryDetails  
}

const level = ({user}: ProfileData) => field("Level", user.level);
const exp = ({user}: ProfileData) => field("EXP", toTenths(user.exp));

const fitScore = ({user}: ProfileData) => pipe(() => 
  format(
    '{1} *({2})*', [
      user.fitScore.score, 
      user.fitScore.rankName
    ]),
  asField("Fit Score")
)();

/** Show the last activity's title, otherwise let user know it's empty */
const lastActivity = ({user, activities}: ProfileData) => pipe(
  ifElse(
    isEmpty,
    always("*No activities in last 30 days*"),
    activityLog(getEmoji(user.gender))
  ),
  asField(`Last Activity`, false)
)(activities.lastActivity)

const activityLog = (emoji: GenderedEmoji) => (activity: Activity) => format(
  '{1} {2} {3}', [
    emoji(activity.type),
    activity.name,
    toRelative(activity.timestamp)
  ])

/** Display totals of each workout type, along with count + time */
const activityTotals = ({activities}: ProfileData) => pipe(
  sortByProp<SummaryStats>("count"),
  map(activityTotalSummary),
  join("\n"),
  asField(`30 Day Totals *(${activities.count} Activities)*`)
)(activities.stats)

const activityTotalSummary = (summary: SummaryStats) => format(
  '**{1}** • {2} activities ({3})', [
    summary.type,
    summary.count,
    summary.totalTime.toString()
  ])

export const createProfileEmbed = (data: ProfileData): MessageOptions["embed"] => ({
  color: 0x4ba7d1,

  author: {
    name: data.member.member.displayName,
    icon_url: data.member.avatar
  },

  fields: [level, exp, fitScore, lastActivity, activityTotals]
    .map(applyTo(data))
})