export class DictionaryManager {
    private static cities: Set<string> = new Set(['Warszawa', 'Kraków', 'Poznań']); // Mock
    private static countries: Set<string> = new Set(['Polska', 'Niemcy', 'Francja']); // Mock
    private static names: Set<string> = new Set(['Anna', 'Jan', 'Piotr', 'Kasia']); // Mock
    private static words: Set<string> = new Set(['Pies', 'Kot', 'Kalkulator']); // Mock

    /**
     * Cleans the input word: trims, lowercase, extracts basic core if needed.
     */
    private static cleanWord(word: string): string {
        return word.trim().toLowerCase();
    }

    /**
     * Validates if a word is in a given dictionary category.
     * Returns true if valid, false if invalid or disputed.
     */
    static validate(word: string, category: string, letter: string): boolean {
        const cleaned = this.cleanWord(word);

        // 1. Must start with the correct letter
        if (!cleaned.startsWith(letter.toLowerCase())) {
            return false;
        }

        // 2. Check mock dictionaries
        // Real implementation would involve fuzzy search or large Sets from DB.
        const normalizedTarget = word.trim();

        switch (category.toLowerCase()) {
            case 'miasto':
                return this.cities.has(normalizedTarget);
            case 'państwo':
                return this.countries.has(normalizedTarget);
            case 'imię':
                return this.names.has(normalizedTarget);
            default:
                // For 'zwierzę', 'roślina', 'rzecz', 'zawód' use generic words list
                return this.words.has(normalizedTarget);
        }
    }

    /**
     * Calculate points based on correctness and uniqueness within players' answers.
     */
    static calculatePoints(
        isCorrect: boolean,
        isUnique: boolean,
        isOnlyAnswer: boolean
    ): number {
        if (!isCorrect) return 0;
        if (isOnlyAnswer) return 15;
        if (isUnique) return 10;
        return 5;
    }
}
