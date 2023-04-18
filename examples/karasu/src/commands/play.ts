import { Command } from '@sapphire/framework';
import { useMasterPlayer } from 'discord-player';
import type { GuildMember } from 'discord.js';

export class PlayCommand extends Command {
	public constructor(context: Command.Context, options: Command.Options) {
		super(context, {
			...options,
			description: 'Plays and enqueues track(s) of the query provided'
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => {
					return option.setName('query').setDescription('A query of your choice').setRequired(true).setAutocomplete(true);
				});
		});
	}

	public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
		const query = interaction.options.getString('query');
		if (!query) return [];

		const player = useMasterPlayer();
		const results = await player!.search(query!);

		let tracks;
		tracks = results!.tracks
			.map((t) => ({
				name: t.title,
				value: t.url
			}))
			.slice(0, 10);

		if (results.playlist) {
			tracks = results!.tracks
				.map(() => ({
					name: `${results.playlist!.title} [playlist]`,
					value: results.playlist!.url
				}))
				.slice(0, 1);
		}

		return interaction.respond(tracks).catch(() => null);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const player = useMasterPlayer();
		const member = interaction.member as GuildMember;
		const permissions = this.container.client.perms.voice(interaction, this.container.client);
		if (permissions.member()) return interaction.reply({ content: permissions.member(), ephemeral: true });
		if (permissions.client()) return interaction.reply({ content: permissions.client(), ephemeral: true });

		const query = interaction.options.getString('query');

		if (permissions.clientToMember()) return interaction.reply({ content: permissions.clientToMember(), ephemeral: true });

		const results = await player!.search(query!);

		if (!results.hasTracks())
			return interaction.reply({
				content: `${this.container.client.dev.error} | **No** tracks were found for your query`,
				ephemeral: true
			});

		await interaction.deferReply();

		try {
			const res = await player!.play(member.voice.channel!.id, results, {
				nodeOptions: {
					metadata: {
						channel: interaction.channel,
						client: interaction.guild?.members.me,
						requestedBy: interaction.user.username
					},
					leaveOnEmptyCooldown: 300000,
					leaveOnEmpty: true,
					leaveOnEnd: false,
					bufferingTimeout: 0,
					volume: 10,
					defaultFFmpegFilters: ['lofi', 'bassboost', 'normalizer']
				}
			});

			return interaction.editReply({
				content: `${this.container.client.dev.success} | Successfully enqueued${
					res.track.playlist ? ` **track(s)** from: **${res.track.playlist.title}**` : `: **${res.track.title}**`
				}`
			});
		} catch (error: any) {
			await interaction.editReply({ content: `${this.container.client.dev.error} | An **error** has occurred` });
			return console.log(error);
		}
	}
}
