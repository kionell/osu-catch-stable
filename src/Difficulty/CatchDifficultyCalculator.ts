import {
  DifficultyCalculator,
  DifficultyRange,
  IBeatmap,
  IMod,
  ModCombination,
  Skill,
} from 'osu-classes';

import {
  CatchHitObject,
  JuiceStream,
  JuiceTinyDroplet,
  BananaShower,
} from '../Objects';

import {
  CatchDoubleTime,
  CatchEasy,
  CatchHalfTime,
  CatchHardRock,
  CatchModCombination,
} from '../Mods';

import { CatchBeatmap } from '../Beatmaps';
import { CatchDifficultyAttributes } from './Attributes';
import { CatchDifficultyHitObject } from './Preprocessing';
import { Movement } from './Skills';

export class CatchDifficultyCalculator extends DifficultyCalculator {
  private static _STAR_SCALING_FACTOR = 0.153;

  private _halfCatcherWidth = 0;

  /**
   * Calculates the difficulty of the beatmap with no mods applied.
   * @returns A structure describing the difficulty of the beatmap.
   */
  calculate(): CatchDifficultyAttributes {
    return super.calculate() as CatchDifficultyAttributes;
  }

  /**
   * Calculates the difficulty of the beatmap using
   * all mod combinations applicable to the beatmap.
   * @returns A collection of structures describing
   * the difficulty of the beatmap for each mod combination.
   */
  calculateAll(): Generator<CatchDifficultyAttributes> {
    return super.calculateAll() as Generator<CatchDifficultyAttributes>;
  }

  /**
   * Calculates the difficulty of the beatmap using a specific mod combination.
   * @param mods The mods that should be applied to the beatmap.
   * @returns A structure describing the difficulty of the beatmap.
   */
  calculateWithMods(mods: CatchModCombination): CatchDifficultyAttributes {
    return super.calculateWithMods(mods) as CatchDifficultyAttributes;
  }

  protected _createDifficultyAttributes(beatmap: IBeatmap, mods: ModCombination, skills: Skill[]): CatchDifficultyAttributes {
    if (beatmap.hitObjects.length === 0) {
      return new CatchDifficultyAttributes(mods, 0);
    }

    const clockRate = beatmap.difficulty.clockRate;
    const approachRate = beatmap.difficulty.approachRate;
    const starMultiplier = CatchDifficultyCalculator._STAR_SCALING_FACTOR;

    /**
     * This is the same as osu!, so there's potential to share the implementation... maybe
     */
    const preempt = DifficultyRange.map(approachRate, 1800, 1200, 450) / clockRate;
    const starRating = Math.sqrt(skills[0].difficultyValue) * starMultiplier;

    const attributes = new CatchDifficultyAttributes(mods, starRating);

    attributes.approachRate = preempt > 1200.0
      ? -(preempt - 1800.0) / 120.0
      : -(preempt - 1200.0) / 150.0 + 5.0;

    attributes.maxCombo = (beatmap as CatchBeatmap)?.maxCombo ?? 0;

    return attributes;
  }

  protected *_createDifficultyHitObjects(beatmap: IBeatmap): Generator<CatchDifficultyHitObject> {
    let lastObject: CatchHitObject | null = null;

    const clockRate = beatmap.difficulty.clockRate;
    const halfCatcherWidth = this._halfCatcherWidth;

    /**
     * In 2B beatmaps, it is possible that 
     * a normal fruit is placed in the middle of a juice stream.
     */
    const hitObjects = beatmap.hitObjects
      .flatMap((obj) => obj instanceof JuiceStream ? obj.nestedHitObjects : obj)
      .sort((a, b) => a.startTime - b.startTime) as CatchHitObject[];

    for (const hitObject of hitObjects) {
      /**
       * We want to only consider fruits that contribute to the combo.
       */
      if (hitObject instanceof BananaShower) continue;
      if (hitObject instanceof JuiceTinyDroplet) continue;

      if (lastObject !== null) {
        yield new CatchDifficultyHitObject(hitObject, lastObject, clockRate, halfCatcherWidth);
      }

      lastObject = hitObject;
    }
  }

  protected _createSkills(beatmap: IBeatmap, mods: ModCombination): Skill[] {
    /**
     * The size of the catcher at 1x scale.
     */
    const BASE_SIZE = Math.fround(106.75);

    /**
     * The width of the catcher which can receive fruit. 
     * Equivalent to "catchMargin" in osu-stable.
     */
    const ALLOWED_CATCH_RANGE = Math.fround(0.8);

    const circleSize = beatmap.difficulty.circleSize;
    const scale = 1 - Math.fround(0.7) * (circleSize - 5) / 5;
    const catcherWidth = BASE_SIZE * Math.abs(scale) * ALLOWED_CATCH_RANGE;

    this._halfCatcherWidth = Math.fround(catcherWidth / 2);

    /**
     * For circle sizes above 5.5, 
     * reduce the catcher width further to simulate imperfect gameplay.
     */
    this._halfCatcherWidth *= 1 - (Math.fround(Math.max(0, circleSize - 5.5) * 0.0625));

    return [
      new Movement(mods, this._halfCatcherWidth, beatmap.difficulty.clockRate),
    ];
  }

  get difficultyMods(): IMod[] {
    return [
      new CatchDoubleTime(),
      new CatchHalfTime(),
      new CatchHardRock(),
      new CatchEasy(),
    ];
  }
}
