// RewardManager: bintang, koin, XP sesuai GDD
// 1 bintang = selesai, 2 bintang = finish 3 besar, 3 bintang = 3 besar + misi tambahan (kumpulkan koin target)
export const RewardManager = {
  missionCoins: (total) => Math.ceil(total * 0.6),

  compute({ position, coins, coinsTotal, tricks = 0, edu = null }) {
    const mission = coins >= this.missionCoins(coinsTotal);
    let stars = 1;
    if (position <= 3) stars = 2;
    if (position <= 3 && mission) stars = 3;
    const bonus = { 1: 40, 2: 25, 3: 15 }[position] ?? 5;
    const eduCorrect = edu?.correct ?? 0, eduAsked = edu?.asked ?? 0;
    const eduPerfect = eduAsked >= 3 && eduCorrect === eduAsked;
    const eduCoins = eduCorrect * 5 + (eduPerfect ? 10 : 0);
    const eduXp = eduCorrect * 15;
    const coinsEarned = coins + bonus + tricks * 3 + eduCoins;
    const xp = 40 + (6 - position) * 20 + coins * 2 + tricks * 10 + eduXp + (stars === 3 ? 50 : 0);
    return { stars, mission, bonus, coinsEarned, xp, tricks, eduAsked, eduCorrect, eduPerfect, eduCoins, eduXp };
  },
};
