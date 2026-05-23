import { onMounted, ref, type Ref } from 'vue';
import anime from 'animejs';

export function useAnime(
  target: Ref<HTMLElement | null>,
  params: anime.AnimeParams,
  options?: { autoplay?: boolean },
) {
  const instance = ref<anime.AnimeInstance | null>(null);

  onMounted(() => {
    if (!target.value) return;
    instance.value = anime({
      targets: target.value,
      autoplay: options?.autoplay ?? true,
      ...params,
    });
  });

  return {
    instance,
    play: () => instance.value?.play(),
    pause: () => instance.value?.pause(),
    restart: () => instance.value?.restart(),
  };
}

export function useStaggerAnime(
  selector: string,
  params: anime.AnimeParams,
) {
  onMounted(() => {
    anime({
      targets: selector,
      ...params,
      delay: anime.stagger(100),
    });
  });
}
