// ─── Excursion Events ───
// Narrative events that appear during the Excursion stage.
// Each event presents choices gated by trainable stats.

import type { TrainableStat } from '$lib/types';

export interface ExcursionEvent {
	id: string;
	scenarioId: string; // which scenarios this event can appear in ('*' = all)
	title: string;
	narrative: string;
	choices: ExcursionEventChoice[];
}

export interface ExcursionEventChoice {
	label: string;
	narrative: string;
	stat: TrainableStat;
	statGain: number;
	psCost: number;
	bondGain: number;
	statRequirement?: { stat: TrainableStat; threshold: number }; // optional gate
	lockoutLabel?: string; // shown when requirement not met
}

/** All excursion events */
export const EXCURSION_EVENTS: ExcursionEvent[] = [
	// ─── Debut scenario events ───
	{
		id: 'debut-tech-setup',
		scenarioId: 'debut',
		title: 'Stream Setup',
		narrative: 'Your VTuber is setting up their streaming equipment for the first time. The audio mixer looks complicated.',
		choices: [
			{
				label: 'Read the manual carefully',
				narrative: 'After spending an hour reading technical documentation, the setup is perfect. Audio quality is top-notch!',
				stat: 'tc',
				statGain: 4,
				psCost: 3,
				bondGain: 1
			},
			{
				label: 'Ask a tech-savvy friend for help',
				narrative: 'A friend walks them through the setup over video call. Quick and efficient!',
				stat: 'tc',
				statGain: 2,
				psCost: 1,
				bondGain: 3,
				statRequirement: { stat: 'ch', threshold: 15 },
				lockoutLabel: 'Need more Charisma to network'
			},
			{
				label: 'Wing it and figure it out live',
				narrative: 'The audience finds the struggle hilarious! Chat helps troubleshoot in real time.',
				stat: 'ch',
				statGain: 3,
				psCost: 4,
				bondGain: 2
			}
		]
	},
	{
		id: 'debut-first-interaction',
		scenarioId: 'debut',
		title: 'First Chat Interaction',
		narrative: 'The first viewer sends a message in chat. Your VTuber freezes for a moment — this is the real deal.',
		choices: [
			{
				label: 'Welcome them warmly by name',
				narrative: 'The viewer is thrilled to be noticed! They become a loyal first subscriber.',
				stat: 'ch',
				statGain: 4,
				psCost: 2,
				bondGain: 3
			},
			{
				label: 'Acknowledge with a joke',
				narrative: 'Chat erupts in laughter. The ice is officially broken!',
				stat: 'ch',
				statGain: 3,
				psCost: 2,
				bondGain: 2
			},
			{
				label: 'Stay focused on content',
				narrative: 'Professional approach. The content quality speaks for itself.',
				stat: 'vc',
				statGain: 3,
				psCost: 1,
				bondGain: 1
			}
		]
	},
	{
		id: 'debut-song-request',
		scenarioId: 'debut',
		title: 'Unexpected Song Request',
		narrative: 'A viewer requests a song. The VTuber wasn\'t prepared for this, but the chat is hyped.',
		choices: [
			{
				label: 'Sing it with confidence',
				narrative: 'The impromptu performance goes viral! Vocals were surprisingly good.',
				stat: 'vc',
				statGain: 5,
				psCost: 5,
				bondGain: 2,
				statRequirement: { stat: 'vc', threshold: 18 },
				lockoutLabel: 'Need more Vocal to sing well'
			},
			{
				label: 'Hum a shortened version',
				narrative: 'Cute and charming! The VTuber promises a full cover soon.',
				stat: 'vc',
				statGain: 2,
				psCost: 2,
				bondGain: 3
			},
			{
				label: 'Politely decline and pivot',
				narrative: 'Smooth transition to planned content. Professional move.',
				stat: 'mg',
				statGain: 3,
				psCost: 1,
				bondGain: 1
			}
		]
	},
	{
		id: 'debut-schedule-plan',
		scenarioId: 'debut',
		title: 'Content Planning',
		narrative: 'After the stream, it\'s time to plan the content schedule. There\'s so much to consider.',
		choices: [
			{
				label: 'Create a detailed weekly plan',
				narrative: 'A well-organized schedule impresses the agency. Consistency builds trust.',
				stat: 'mg',
				statGain: 4,
				psCost: 3,
				bondGain: 1
			},
			{
				label: 'Go with the flow and adapt',
				narrative: 'Flexible approach keeps content fresh and exciting for viewers.',
				stat: 'ch',
				statGain: 3,
				psCost: 2,
				bondGain: 2
			}
		]
	},

	// ─── Collab scenario events ───
	{
		id: 'collab-chemistry',
		scenarioId: 'collab',
		title: 'Finding Chemistry',
		narrative: 'Two VTubers meet for the first time in a collab. The tension is palpable — will they click?',
		choices: [
			{
				label: 'Break the ice with a game',
				narrative: 'A competitive game instantly brings out their competitive sides. Banter ensues!',
				stat: 'ch',
				statGain: 4,
				psCost: 3,
				bondGain: 4
			},
			{
				label: 'Share personal stories',
				narrative: 'Deep conversation creates genuine connection. Viewers feel the warmth.',
				stat: 'ch',
				statGain: 5,
				psCost: 4,
				bondGain: 3,
				statRequirement: { stat: 'ch', threshold: 20 },
				lockoutLabel: 'Need more Charisma for deep talk'
			},
			{
				label: 'Focus on the technical setup',
				narrative: 'Both VTubers are impressed by each other\'s studio quality.',
				stat: 'tc',
				statGain: 3,
				psCost: 2,
				bondGain: 2
			}
		]
	},
	{
		id: 'collab-duet',
		scenarioId: 'collab',
		title: 'Impromptu Duet',
		narrative: 'One VTuber starts singing, and the other joins in unexpectedly. A duet moment!',
		choices: [
			{
				label: 'Harmonize together',
				narrative: 'The harmonies are beautiful! This collab just became legendary.',
				stat: 'vc',
				statGain: 5,
				psCost: 5,
				bondGain: 5,
				statRequirement: { stat: 'vc', threshold: 22 },
				lockoutLabel: 'Need more Vocal for harmonies'
			},
			{
				label: 'Take turns with solo parts',
				narrative: 'Each shines in their moment. The audience loves the variety.',
				stat: 'vc',
				statGain: 3,
				psCost: 3,
				bondGain: 3
			},
			{
				label: 'Beatbox and rap battle instead',
				narrative: 'Unexpected turn! The rap battle sends chat into a frenzy.',
				stat: 'ch',
				statGain: 4,
				psCost: 4,
				bondGain: 4
			}
		]
	},
	{
		id: 'collab-management',
		scenarioId: 'collab',
		title: 'Stream Direction',
		narrative: 'The collab is losing momentum. Someone needs to take charge of the stream direction.',
		choices: [
			{
				label: 'Steer with a structured plan',
				narrative: 'The VTuber takes the lead, suggesting activities and transitions. The stream flows smoothly.',
				stat: 'mg',
				statGain: 4,
				psCost: 3,
				bondGain: 2
			},
			{
				label: 'Let the other VTuber lead',
				narrative: 'Supportive approach. The other VTuber appreciates the trust.',
				stat: 'mg',
				statGain: 2,
				psCost: 1,
				bondGain: 4
			},
			{
				label: 'Pivot to audience suggestions',
				narrative: 'Chat takes the wheel! The impromptu content is surprisingly entertaining.',
				stat: 'ch',
				statGain: 3,
				psCost: 3,
				bondGain: 3
			}
		]
	},

	// ─── Marathon scenario events ───
	{
		id: 'marathon-burnout',
		scenarioId: 'marathon',
		title: 'Mid-Marathon Slump',
		narrative: 'Three hours in, energy is dropping. The VTuber is visibly tired but chat wants more.',
		choices: [
			{
				label: 'Power through with energy drinks',
				narrative: 'Caffeine kicks in! Second wind achieved, but there might be a crash later...',
				stat: 'tc',
				statGain: 3,
				psCost: 5,
				bondGain: 2
			},
			{
				label: 'Take a short break',
				narrative: 'A 10-minute break refreshes everyone. The comeback stream is even better.',
				stat: 'mg',
				statGain: 3,
				psCost: 2,
				bondGain: 3
			},
			{
				label: 'Switch to a chill segment',
				narrative: 'Zatsudan and chatting mode activated. Low energy, high engagement.',
				stat: 'ch',
				statGain: 4,
				psCost: 2,
				bondGain: 2
			}
		]
	},
	{
		id: 'marathon-challenge',
		scenarioId: 'marathon',
		title: 'Chat Challenge',
		narrative: 'Chat votes for an extreme challenge: speedrun a notoriously difficult game. The VTuber hesitates.',
		choices: [
			{
				label: 'Accept the challenge confidently',
				narrative: 'Despite many deaths, the never-give-up attitude wins hearts. Entertainment value is off the charts.',
				stat: 'vc',
				statGain: 5,
				psCost: 6,
				bondGain: 4,
				statRequirement: { stat: 'vc', threshold: 25 },
				lockoutLabel: 'Need more Vocal for epic reactions'
			},
			{
				label: 'Negotiate an easier version',
				narrative: 'Smart compromise. The chat accepts and everyone has fun.',
				stat: 'mg',
				statGain: 3,
				psCost: 2,
				bondGain: 2
			},
			{
				label: 'Redirect to chat games instead',
				narrative: 'Quick thinking saves the stream. Chat games are a hit!',
				stat: 'ch',
				statGain: 3,
				psCost: 2,
				bondGain: 3
			}
		]
	},
	{
		id: 'marathon-collab-drop',
		scenarioId: 'marathon',
		title: 'Surprise Guest',
		narrative: 'A fellow VTuber drops into the stream unannounced. The marathon just got a lot more interesting!',
		choices: [
			{
				label: 'Welcome them to co-stream',
				narrative: 'The surprise collab moment sends viewer counts soaring!',
				stat: 'ch',
				statGain: 5,
				psCost: 4,
				bondGain: 5
			},
			{
				label: 'Hand over the stream briefly',
				narrative: 'A brief handover lets the VTuber rest while the guest entertains. Strategic move.',
				stat: 'mg',
				statGain: 4,
				psCost: 2,
				bondGain: 3
			},
			{
				label: 'Challenge them to a duel',
				narrative: 'The impromptu competition is legendary content!',
				stat: 'vc',
				statGain: 4,
				psCost: 4,
				bondGain: 4
			}
		]
	},

	// ─── Universal events (any scenario) ───
	{
		id: 'universal-supachat',
		scenarioId: '*',
		title: 'Big Super Chat',
		narrative: 'A massive super chat lights up the screen! The VTuber reads the heartfelt message from a long-time fan.',
		choices: [
			{
				label: 'Give an emotional thank you',
				narrative: 'Genuine gratitude moves everyone. The moment is beautiful.',
				stat: 'ch',
				statGain: 3,
				psCost: 2,
				bondGain: 4
			},
			{
				label: 'Celebrate with a song',
				narrative: 'The dedicated song makes the super chat even more special.',
				stat: 'vc',
				statGain: 3,
				psCost: 3,
				bondGain: 3
			},
			{
				label: 'Add to the stream plan',
				narrative: 'Professional acknowledgment and content integration.',
				stat: 'mg',
				statGain: 2,
				psCost: 1,
				bondGain: 2
			}
		]
	},
	{
		id: 'universal-technical-glitch',
		scenarioId: '*',
		title: 'Technical Difficulties',
		narrative: 'The stream suddenly lags and the audio cuts out. Chat floods with "F" messages.',
		choices: [
			{
				label: 'Troubleshoot on stream',
				narrative: 'The transparent troubleshooting process earns respect. Chat rallies behind the VTuber.',
				stat: 'tc',
				statGain: 4,
				psCost: 3,
				bondGain: 2
			},
			{
				label: 'Entertain chat while fixing',
				narrative: 'Multitasking at its finest! Keeping chat engaged while handling tech issues.',
				stat: 'ch',
				statGain: 4,
				psCost: 3,
				bondGain: 3
			},
			{
				label: 'Quick restart the stream',
				narrative: 'Fast recovery minimizes downtime. Professional handling.',
				stat: 'mg',
				statGain: 3,
				psCost: 2,
				bondGain: 1
			}
		]
	}
];

/** Get excursion events for a given scenario */
export function getEventsForScenario(scenarioId: string): ExcursionEvent[] {
	return EXCURSION_EVENTS.filter(e => e.scenarioId === '*' || e.scenarioId === scenarioId);
}

/** Pick a random excursion event for a scenario (avoiding recently seen IDs) */
export function pickRandomEvent(scenarioId: string, excludeIds: string[] = []): ExcursionEvent {
	const pool = getEventsForScenario(scenarioId).filter(e => !excludeIds.includes(e.id));
	if (pool.length === 0) {
		// Fallback: allow any event for this scenario
		const allPool = getEventsForScenario(scenarioId);
		if (allPool.length === 0) throw new Error(`No excursion events for scenario ${scenarioId}`);
		return allPool[Math.floor(Math.random() * allPool.length)];
	}
	return pool[Math.floor(Math.random() * pool.length)];
}
