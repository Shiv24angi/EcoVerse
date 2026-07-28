import {
  getActiveChallenges,
  getChallengeStatus,
  findChallengeById,
} from '../challenges';
import { IScan, IUserChallengeRecord } from '../../models/User';

describe('Sustainability Challenges (lib/challenges.ts)', () => {
  const now = new Date('2026-07-28T12:00:00Z'); // Tuesday

  const sampleScans: IScan[] = [
    {
      productName: 'Eco Bottle',
      carbonEstimate: 0.4,
      category: 'Beverage',
      confidence: 'high',
      barcode: '12345678',
      date: new Date('2026-07-27T10:00:00Z'), // Monday inside week window
    },
    {
      productName: 'Paper Notebook',
      carbonEstimate: 0.8,
      category: 'Stationery',
      confidence: 'high',
      barcode: '87654321',
      date: new Date('2026-07-28T09:00:00Z'), // Tuesday inside week window
    },
    {
      productName: 'Plastic Box',
      carbonEstimate: 2.5,
      category: 'Container',
      confidence: 'medium',
      barcode: '11223344',
      date: new Date('2026-07-28T11:00:00Z'), // Tuesday inside week window
    },
    {
      productName: 'Old Scan',
      carbonEstimate: 0.2,
      category: 'Food',
      confidence: 'high',
      barcode: '99999999',
      date: new Date('2026-07-15T10:00:00Z'), // Outside challenge window (weeks ago)
    },
    {
      productName: 'Future Scan',
      carbonEstimate: 0.1,
      category: 'Food',
      confidence: 'high',
      barcode: '88888888',
      date: new Date('2026-08-10T10:00:00Z'), // Outside challenge window (future)
    },
  ];

  test('calculates active challenges and week window correctly', () => {
    const challenges = getActiveChallenges(now);
    expect(challenges.length).toBeGreaterThan(0);
    expect(challenges[0].id).toContain('weekly_scan_5');
  });

  test('ignores scans outside the active challenge window', () => {
    const challenges = getActiveChallenges(now);
    const scanHeroChallenge = challenges.find((c) =>
      c.id.includes('weekly_scan_5')
    )!;

    const status = getChallengeStatus(scanHeroChallenge, sampleScans, [], now);
    expect(status.scansInWindowCount).toBe(3); // Only 3 scans fall into current week
    expect(status.currentProgress).toBe(3);
    expect(status.isCompleted).toBe(false);
  });

  test('detects challenge completion when target is reached', () => {
    const challenges = getActiveChallenges(now);
    const ecoChoiceChallenge = challenges.find((c) =>
      c.id.includes('weekly_recyclable_3')
    )!;

    // 2 low carbon scans in sampleScans (0.4 and 0.8)
    let status = getChallengeStatus(ecoChoiceChallenge, sampleScans, [], now);
    expect(status.currentProgress).toBe(2);
    expect(status.isCompleted).toBe(false);

    // Add 3rd low carbon scan in window
    const updatedScans: IScan[] = [
      ...sampleScans,
      {
        productName: 'Eco Bag',
        carbonEstimate: 0.3,
        category: 'Apparel',
        confidence: 'high',
        barcode: '55555555',
        date: new Date('2026-07-28T14:00:00Z'),
      },
    ];

    status = getChallengeStatus(ecoChoiceChallenge, updatedScans, [], now);
    expect(status.currentProgress).toBe(3);
    expect(status.isCompleted).toBe(true);
  });

  test('handles expired challenges', () => {
    const challenges = getActiveChallenges(now);
    const challenge = challenges[0];
    const futureDate = new Date('2026-08-10T00:00:00Z');

    const status = getChallengeStatus(challenge, sampleScans, [], futureDate);
    expect(status.isExpired).toBe(true);
  });

  test('tracks claimed status correctly', () => {
    const challenges = getActiveChallenges(now);
    const challenge = challenges[0];
    const completedRecords: IUserChallengeRecord[] = [
      {
        challengeId: challenge.id,
        completedAt: new Date(),
        pointsEarned: 100,
      },
    ];

    const status = getChallengeStatus(
      challenge,
      sampleScans,
      completedRecords,
      now
    );
    expect(status.isClaimed).toBe(true);
  });

  test('handles Carbon Saver progress and completion condition consistently', () => {
    const challenges = getActiveChallenges(now);
    const carbonSaver = challenges.find((c) =>
      c.id.includes('weekly_low_carbon_target')
    )!;

    // Case 1: 3 low carbon scans within total 3.0kg CO2 limit (0.5 + 0.5 + 0.8 = 1.8kg)
    const validScans: IScan[] = [
      {
        productName: 'A',
        carbonEstimate: 0.5,
        category: 'Food',
        confidence: 'high',
        barcode: '1',
        date: new Date('2026-07-27T10:00:00Z'),
      },
      {
        productName: 'B',
        carbonEstimate: 0.5,
        category: 'Food',
        confidence: 'high',
        barcode: '2',
        date: new Date('2026-07-27T11:00:00Z'),
      },
      {
        productName: 'C',
        carbonEstimate: 0.8,
        category: 'Food',
        confidence: 'high',
        barcode: '3',
        date: new Date('2026-07-27T12:00:00Z'),
      },
    ];

    const completedStatus = getChallengeStatus(
      carbonSaver,
      validScans,
      [],
      now
    );
    expect(completedStatus.isCompleted).toBe(true);
    expect(completedStatus.currentProgress).toBe(3);
    expect(completedStatus.progressPercentage).toBe(100);

    // Case 2: 3 high carbon scans exceeding 3.0kg CO2 limit (1.5 + 1.5 + 1.0 = 4.0kg)
    const highCarbonScans: IScan[] = [
      {
        productName: 'A',
        carbonEstimate: 1.5,
        category: 'Food',
        confidence: 'high',
        barcode: '1',
        date: new Date('2026-07-27T10:00:00Z'),
      },
      {
        productName: 'B',
        carbonEstimate: 1.5,
        category: 'Food',
        confidence: 'high',
        barcode: '2',
        date: new Date('2026-07-27T11:00:00Z'),
      },
      {
        productName: 'C',
        carbonEstimate: 1.0,
        category: 'Food',
        confidence: 'high',
        barcode: '3',
        date: new Date('2026-07-27T12:00:00Z'),
      },
    ];

    const incompleteStatus = getChallengeStatus(
      carbonSaver,
      highCarbonScans,
      [],
      now
    );
    expect(incompleteStatus.isCompleted).toBe(false);
    expect(incompleteStatus.currentProgress).toBe(2);
    expect(incompleteStatus.progressPercentage).toBeLessThan(100);
  });

  test('locates challenge definitions across week rollovers using findChallengeById', () => {
    const pastChallengeId = 'weekly_scan_5_2026-07-20';
    const foundChallenge = findChallengeById(pastChallengeId);

    expect(foundChallenge).toBeDefined();
    expect(foundChallenge?.id).toBe(pastChallengeId);
    expect(foundChallenge?.name).toBe('Weekly Scan Hero');
  });
});
