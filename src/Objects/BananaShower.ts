import { CatchHitObject } from './CatchHitObject';
import { CatchEventGenerator } from './CatchEventGenerator';

export class BananaShower extends CatchHitObject implements ISpinnableObject {
  get hitType(): HitType {
    let hitType = this.base.hitType;

    hitType &= ~HitType.Normal;
    hitType &= ~HitType.Slider;
    hitType &= ~HitType.Hold;

    return hitType | HitType.Spinner;
  }

  get duration(): number {
    return (this.base as ISpinnableObject).endTime - this.startTime;
  }

  set duration(value: number) {
    (this.base as ISpinnableObject).endTime = this.startTime + value;
  }

  get endTime(): number {
    return (this.base as ISpinnableObject).endTime;
  }

  set endTime(value: number) {
    (this.base as ISpinnableObject).endTime = value;
  }

  createNestedHitObjects(): void {
    this.nestedHitObjects = [];

    for (const nested of CatchEventGenerator.generateBananas(this)) {
      this.nestedHitObjects.push(nested);
    }
  }
}
