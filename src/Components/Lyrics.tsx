import { useEffect, useRef, useState } from "react";
import { Text } from "rsuite";
import type { LyricDto, LyricLine } from "../Client";
import { getLyrics } from "../Client";
import { getCacheStorage } from "../storage";
import { useAppDispatch } from "../store/hooks";
import { setLoading } from "../store/slices/loadingSlice";
import { setPlaybackState, type PlaybackState } from "../store/slices/playbackSlice";
import Icon from "./Icon";

const cacheStorage = getCacheStorage();

export default function Lyrics(props: { state: PlaybackState; position: number }) {
  const dispatch = useAppDispatch();
  const state = props.state;
  const lastLine = useRef(-1);
  const [lyrics, setLyrics] = useState<LyricDto | null>(null);

  let isSynced = true;

  async function fetchLyrics() {
    let newLyrics: LyricDto | null | undefined = null;
    if (state.item && state.item.HasLyrics) {
      if (!cacheStorage.get(`lyrics-${state.item.Id}`)) {
        dispatch(setLoading(true));

        const lyricsResponse = await getLyrics({
          path: { itemId: state.item.Id! }
        });
        newLyrics = lyricsResponse.data;
        cacheStorage.set(`lyrics-${state.item.Id}`, newLyrics);
        dispatch(setLoading(false));
      } else {
        newLyrics = cacheStorage.get(`lyrics-${state.item.Id}`);
      }
    } else {
      newLyrics = {
        Lyrics: [
          {
            Text: "No lyrics found"
          }
        ]
      };
    }
    setLyrics(newLyrics!);
  }

  useEffect(() => {
    fetchLyrics();
  }, []);
  useEffect(() => {
    fetchLyrics();
  }, [state]);

  let activeLines: LyricLine[] = [];

  if (lyrics) {
    activeLines = lyrics.Lyrics!.filter((line) => {
      if (!("Start" in line)) {
        isSynced = false;
      }
      return props.position >= line.Start! / 10000;
    });
  }

  return (
    <>
      {lyrics && (
        <div className="lyrics">
          {lyrics.Lyrics!.map((line, index) => {
            const isCurrent = index === activeLines.length - 1;

            if (isCurrent && lastLine.current !== index) {
              lastLine.current = index;
              // Scroll to the current line
              const lineElement = document.querySelector(`.lyrics > p:nth-child(${index + 1})`);
              if (lineElement) {
                lineElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center"
                });
              }
            }

            return (
              <Text
                className={isSynced ? "pointer" : ""}
                onClick={() => {
                  if (!isSynced) {
                    return;
                  }
                  if (line.Start == null) {
                    return;
                  }
                  dispatch(
                    setPlaybackState({
                      ...state,
                      position: line.Start / 1e7
                    })
                  );
                }}
                muted={isSynced ? !isCurrent : false}
                key={index + (line.Start || "").toString()}
              >
                {line.Text || <Icon icon="more_horiz" noSpace />}
              </Text>
            );
          })}
        </div>
      )}
    </>
  );
}
