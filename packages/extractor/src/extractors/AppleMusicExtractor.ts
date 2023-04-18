import { BaseExtractor, ExtractorInfo, ExtractorSearchContext, Playlist, QueryType, SearchQueryType, Track, Util } from 'discord-player';
import { AppleMusic } from '../internal';
import { Readable } from 'stream';
import { YoutubeExtractor } from './YoutubeExtractor';
import { StreamFN, loadYtdl, makeYTSearch } from './common/helper';

export interface AppleMusicExtractorInit {
    createStream?: (ext: AppleMusicExtractor, url: string) => Promise<Readable | string>;
}

export class AppleMusicExtractor extends BaseExtractor<AppleMusicExtractorInit> {
    public static identifier = 'com.discord-player.applemusicextractor' as const;
    private _stream!: StreamFN;
    private _isYtdl = false;

    public async activate(): Promise<void> {
        const fn = this.options.createStream;

        if (typeof fn === 'function') {
            this._isYtdl = false;
            this._stream = (q: string) => {
                return fn(this, q);
            };

            return;
        }

        const lib = await loadYtdl(this.context.player.options.ytdlOptions);
        this._stream = lib.stream;
        this._isYtdl = true;
    }

    public async validate(query: string, type?: SearchQueryType | null | undefined): Promise<boolean> {
        // prettier-ignore
        return (<SearchQueryType[]>[
            QueryType.APPLE_MUSIC_ALBUM,
            QueryType.APPLE_MUSIC_PLAYLIST,
            QueryType.APPLE_MUSIC_SONG,
            QueryType.APPLE_MUSIC_SEARCH,
            QueryType.AUTO,
            QueryType.AUTO_SEARCH
        ]).some((t) => t === type);
    }

    public async getRelatedTracks(track: Track) {
        if (track.queryType === QueryType.APPLE_MUSIC_SONG)
            return this.handle(track.author || track.title, {
                type: QueryType.APPLE_MUSIC_SEARCH,
                requestedBy: track.requestedBy
            });

        return this.createResponse();
    }

    public async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
        switch (context.type) {
            case QueryType.AUTO:
            case QueryType.AUTO_SEARCH:
            case QueryType.APPLE_MUSIC_SEARCH: {
                const data = await AppleMusic.search(query);
                if (!data || !data.length) return this.createResponse();
                const tracks = data.map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (m: any) => {
                        const track = new Track(this.context.player, {
                            author: m.artist.name,
                            description: m.title,
                            duration: typeof m.duration === 'number' ? Util.buildTimeCode(Util.parseMS(m.duration)) : m.duration,
                            thumbnail: m.thumbnail,
                            title: m.title,
                            url: m.url,
                            views: 0,
                            source: 'apple_music',
                            requestedBy: context.requestedBy,
                            queryType: 'appleMusicSong'
                        });

                        track.extractor = this;

                        return track;
                    }
                );

                return this.createResponse(null, tracks);
            }
            case QueryType.APPLE_MUSIC_ALBUM: {
                const info = await AppleMusic.getAlbumInfo(query);
                if (!info) return this.createResponse();

                const playlist = new Playlist(this.context.player, {
                    author: {
                        name: info.artist.name,
                        url: ''
                    },
                    description: info.title,
                    id: info.id,
                    source: 'apple_music',
                    thumbnail: info.thumbnail,
                    title: info.title,
                    tracks: [],
                    type: 'album',
                    url: info.url,
                    rawPlaylist: info
                });

                playlist.tracks = info.tracks.map(
                    (
                        m: any // eslint-disable-line
                    ) => {
                        const track = new Track(this.context.player, {
                            author: m.artist.name,
                            description: m.title,
                            duration: typeof m.duration === 'number' ? Util.buildTimeCode(Util.parseMS(m.duration)) : m.duration,
                            thumbnail: m.thumbnail,
                            title: m.title,
                            url: m.url,
                            views: 0,
                            source: 'apple_music',
                            requestedBy: context.requestedBy,
                            queryType: 'appleMusicSong'
                        });
                        track.extractor = this;
                        return track;
                    }
                );

                return { playlist, tracks: playlist.tracks };
            }
            case QueryType.APPLE_MUSIC_PLAYLIST: {
                const info = await AppleMusic.getPlaylistInfo(query);
                if (!info) return this.createResponse();

                const playlist = new Playlist(this.context.player, {
                    author: {
                        name: info.artist.name,
                        url: ''
                    },
                    description: info.title,
                    id: info.id,
                    source: 'apple_music',
                    thumbnail: info.thumbnail,
                    title: info.title,
                    tracks: [],
                    type: 'playlist',
                    url: info.url,
                    rawPlaylist: info
                });

                playlist.tracks = info.tracks.map(
                    (
                        m: any // eslint-disable-line
                    ) => {
                        const track = new Track(this.context.player, {
                            author: m.artist.name,
                            description: m.title,
                            duration: typeof m.duration === 'number' ? Util.buildTimeCode(Util.parseMS(m.duration)) : m.duration,
                            thumbnail: m.thumbnail,
                            title: m.title,
                            url: m.url,
                            views: 0,
                            source: 'apple_music',
                            requestedBy: context.requestedBy,
                            queryType: 'appleMusicSong'
                        });

                        track.extractor = this;

                        return track;
                    }
                );

                return { playlist, tracks: playlist.tracks };
            }
            case QueryType.APPLE_MUSIC_SONG: {
                const info = await AppleMusic.getSongInfo(query);
                if (!info) return this.createResponse();

                const track = new Track(this.context.player, {
                    author: info.artist.name,
                    description: info.title,
                    duration: typeof info.duration === 'number' ? Util.buildTimeCode(Util.parseMS(info.duration)) : info.duration,
                    thumbnail: info.thumbnail,
                    title: info.title,
                    url: info.url,
                    views: 0,
                    source: 'apple_music',
                    requestedBy: context.requestedBy,
                    queryType: context.type
                });

                track.extractor = this;

                return { playlist: null, tracks: [track] };
            }
            default:
                return { playlist: null, tracks: [] };
        }
    }

    public async stream(info: Track): Promise<string | Readable> {
        if (!this._stream) {
            throw new Error(`Could not initialize streaming api for '${this.constructor.name}'`);
        }

        let url = info.url;

        if (this._isYtdl) {
            if (YoutubeExtractor.validateURL(info.raw.url)) url = info.raw.url;
            else {
                const _url = await makeYTSearch(`${info.title} ${info.author}`, 'video')
                    .then((r) => r[0].url)
                    .catch(Util.noop);
                if (!_url) throw new Error('Failed to fetch resources for ytdl streaming');
                info.raw.url = url = _url;
            }
        }

        return this._stream(url);
    }
}
