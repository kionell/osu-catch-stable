import fs from 'fs';
import path from 'path';
import { IHitStatistics, IScoreInfo, ScoreInfo } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';

import {
  CatchRuleset,
  CatchDifficultyAttributes,
  CatchBeatmap,
  JuiceFruit,
  JuiceTinyDroplet,
  JuiceDroplet,
} from '../src';

import { ILoadedFiles } from './Interfaces';

const ruleset = new CatchRuleset();
const decoder = new BeatmapDecoder();

describe('Standard converted beatmaps', () => testRuleset('Standard'));
describe('Catch specific beatmaps', () => testRuleset('Catch'));
describe('Mania converted beatmaps', () => testRuleset('Mania'));

function testRuleset(rulesetName: string): void {
  const rulesetPath = path.resolve(__dirname, `./Files/${rulesetName}`);

  testBeatmaps(rulesetPath);
}

function testBeatmaps(rulesetPath: string): void {
  const beatmapsPath = path.resolve(rulesetPath, './Beatmaps');
  const beatmapFiles = fs.readdirSync(beatmapsPath);

  for (const beatmapFile of beatmapFiles) {
    const beatmapPath = path.resolve(beatmapsPath, beatmapFile);
    const data = loadTestFiles(rulesetPath, beatmapFile.split('.')[0]);

    const decoded = decoder.decodeFromPath(beatmapPath, false);

    for (const acronym in data.stars) {
      const mods = ruleset.createModCombination(acronym);
      const beatmap = ruleset.applyToBeatmapWithMods(decoded, mods);

      testBeatmap(beatmap, data);
    }
  }
}

function testBeatmap(beatmap: CatchBeatmap, data: ILoadedFiles): void {
  const acronyms = beatmap.mods.toString();

  const difficultyCalculator = ruleset.createDifficultyCalculator(beatmap);
  const difficulty = difficultyCalculator.calculate();

  const score = simulateScore(beatmap, difficulty);
  const performanceCalculator = ruleset.createPerformanceCalculator(difficulty, score);
  const performance = performanceCalculator.calculate();

  const { artist, title, version } = beatmap.metadata;

  describe(`${artist} - ${title} [${version}] +${acronyms}`, () => {
    it('Should match beatmap max combo', () => {
      expect(difficulty.maxCombo).toEqual(data.values.maxCombo);
    });

    test('Should match star ratings', () => {
      expect(difficulty.starRating).toBeCloseTo(data.stars[acronyms], 1);
    });

    test('Should match performances', () => {
      expect(performance).toBeCloseTo(data.performances[acronyms], 0);
    });
  });
}

function loadTestFiles(rulesetPath: string, beatmapId: string): ILoadedFiles {
  const paths = [
    `${rulesetPath}/Values/${beatmapId}.json`,
    `${rulesetPath}/Stars/${beatmapId}.json`,
    `${rulesetPath}/Performances/${beatmapId}.json`,
  ];

  return {
    values: JSON.parse(fs.readFileSync(paths[0]).toString()),
    stars: JSON.parse(fs.readFileSync(paths[1]).toString()),
    performances: JSON.parse(fs.readFileSync(paths[2]).toString()),
  };
}

function simulateScore(beatmap: CatchBeatmap, attributes: CatchDifficultyAttributes): IScoreInfo {
  return new ScoreInfo({
    maxCombo: attributes.maxCombo,
    mods: attributes.mods,
    statistics: getStatistics(beatmap),
    accuracy: 1,
  });
}

function getStatistics(beatmap: CatchBeatmap): Partial<IHitStatistics> {
  const nestedFruits = beatmap.hitObjects.reduce((f, h) => {
    const nested = h.nestedHitObjects;

    return f + nested.reduce((f, h) => f + (h instanceof JuiceFruit ? 1 : 0), 0);
  }, 0);

  const smallTickHit = beatmap.hitObjects.reduce((t, h) => {
    return t + h.nestedHitObjects.reduce((t, h) => {
      return t + (h instanceof JuiceTinyDroplet ? 1 : 0);
    }, 0);
  }, 0);

  const tickHit = beatmap.hitObjects.reduce((t, h) => {
    return t + h.nestedHitObjects.reduce((t, h) => {
      return t + (h instanceof JuiceDroplet ? 1 : 0);
    }, 0);
  }, 0);

  return {
    great: beatmap.fruits + nestedFruits,
    largeTickHit: tickHit - smallTickHit,
    smallTickHit,
  };
}
