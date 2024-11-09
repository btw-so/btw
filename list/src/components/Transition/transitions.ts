import styled from 'styled-components';

import { easing } from 'modules/theme';

const Fade = styled.div`
  will-change: opacity, transform;

  &.fade-appear,
  &.fade-enter {
    opacity: 0.01;
  }

  &.fade-appear {
    &.fade-appear-active {
      opacity: 1;
      transition: 0.3s opacity;
    }
  }

  &.fade-enter {
    &.fade-enter-active {
      opacity: 1;
      transition: 0.3s opacity;
    }
  }

  &.fade-exit {
    opacity: 1;

    &.fade-exit-active {
      opacity: 0.01;
      transition: 0.3s opacity;
    }
  }
`;

const SlideDown = styled.div`
  will-change: opacity, transform;

  &.slide-down-appear,
  &.slide-down-enter {
    opacity: 0.01;
    transform: translate3d(0, -100%, 0);
  }

  &.slide-down-appear {
    &.slide-down-appear-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }

  &.slide-down-enter {
    &.slide-down-enter-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }

  &.slide-down-exit {
    opacity: 1;
    transform: translate3d(0, 0, 0);

    &.slide-down-exit-active {
      opacity: 0.01;
      transform: translate3d(0, -100%, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }
`;

const SlideLeft = styled.div`
  will-change: opacity, transform;

  &.slide-left-appear,
  &.slide-left-enter {
    opacity: 0.01;
    transform: translate3d(100%, 0, 0);
  }

  &.slide-left-appear {
    &.slide-left-appear-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }

  &.slide-left-enter {
    &.slide-left-enter-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }

  &.slide-left-exit {
    opacity: 1;
    transform: translate3d(0, 0, 0);

    &.slide-left-exit-active {
      opacity: 0.01;
      transform: translate3d(100%, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }
`;

const SlideRight = styled.div`
  will-change: opacity, transform;

  &.slide-right-appear,
  &.slide-right-enter {
    opacity: 0.01;
    transform: translate3d(-100%, 0, 0);
  }

  &.slide-right-appear {
    &.slide-right-appear-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }

  &.slide-right-enter {
    &.slide-right-enter-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }

  &.slide-right-exit {
    opacity: 1;
    transform: translate3d(0, 0, 0);

    &.slide-right-exit-active {
      opacity: 0.01;
      transform: translate3d(-100%, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }
`;

const SlideUp = styled.div`
  will-change: opacity, transform;

  &.slide-up-appear,
  &.slide-up-enter {
    opacity: 0.01;
    transform: translate3d(0, 100%, 0);
  }

  &.slide-up-appear {
    &.slide-up-appear-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }

  &.slide-up-enter {
    &.slide-up-enter-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }

  &.slide-up-exit {
    opacity: 1;
    transform: translate3d(0, 0, 0);

    &.slide-up-exit-active {
      opacity: 0.01;
      transform: translate3d(0, 100%, 0);
      transition: 0.3s opacity, 0.3s transform ${easing};
    }
  }
`;

export const classNames = {
  fade: 'fade',
  slideDown: 'slide-down',
  slideLeft: 'slide-left',
  slideRight: 'slide-right',
  slideUp: 'slide-up',
};

export default {
  fade: Fade,
  slideDown: SlideDown,
  slideLeft: SlideLeft,
  slideRight: SlideRight,
  slideUp: SlideUp,
};
