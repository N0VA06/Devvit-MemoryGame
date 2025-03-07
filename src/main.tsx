import {Devvit} from '@devvit/public-api'

// Card symbols for the memory game - expanded set
const symbols = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', 
  '🐷', '🐸', '🐵', '🦄', '🦋', '🐢', '🐙', '🦀', '🦑', '🦞', '🦐', '🐬',
  '🐳', '🦕', '🦖', '🐘', '🦒', '🦓', '🦍', '🐆', '🐅', '🐊', '🦅', '🦉'
];

// Game states
type GameState = 'setup' | 'playing' | 'won' | 'timeup';

// Theme constants
const THEME = {
  background: '#121212',
  cardBack: '#1E1E1E',
  cardFront: '#2D2D2D',
  cardMatched: '#143A2F',
  accent: '#BB86FC',
  accentSecondary: '#03DAC6',
  error: '#CF6679',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textDisabled: 'rgba(255, 255, 255, 0.38)',
  progressBackground: 'rgba(255, 255, 255, 0.12)',
}

Devvit.addCustomPostType({
  name: 'Memory Game',
  height: "tall",
  render: context => {
    const { useState } = context;
    
    // Game state management
    const [gameState, setGameState] = useState<GameState>('setup');
    const [gridSize, setGridSize] = useState(4); // 4x4 grid by default
    const [difficulty, setDifficulty] = useState('medium'); // easy, medium, hard
    const [cards, setCards] = useState<string[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matchedIndices, setMatchedIndices] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [gameStartTime, setGameStartTime] = useState(0);
    const [bestScore, setBestScore] = useState<Record<string, {moves: number, time: number}>>({
      'easy': {moves: Infinity, time: Infinity},
      'medium': {moves: Infinity, time: Infinity},
      'hard': {moves: Infinity, time: Infinity}
    });
    
    // Animation states
    const [recentMatch, setRecentMatch] = useState<number[]>([]);
    const [showMatchAnimation, setShowMatchAnimation] = useState(false);
    const [matchCount, setMatchCount] = useState(0);
    
    // Initialize game with shuffled cards
    const startGame = () => {
      // Create pairs of symbols
      const numPairs = (gridSize * gridSize) / 2;
      const symbolsToUse = symbols
        .sort(() => 0.5 - Math.random()) // Randomly select symbols
        .slice(0, numPairs);
      const cardPairs = [...symbolsToUse, ...symbolsToUse];
      
      // Shuffle the cards
      const shuffled = cardPairs
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
      
      setCards(shuffled);
      setFlippedIndices([]);
      setMatchedIndices([]);
      setRecentMatch([]);
      setShowMatchAnimation(false);
      setMatchCount(0);
      setMoves(0);
      setTimeElapsed(0);
      
      // Set the game start time to current time
      const startTime = Date.now();
      setGameStartTime(startTime);
      setGameState('playing');
      
      // Clear any existing timer
      if (context.additionalData?.timer) {
        clearInterval(context.additionalData.timer);
      }
      
      // Start the timer
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeElapsed(elapsed);
        
        // End game after 2 minutes (120 seconds)
        if (elapsed >= 120) {
          clearInterval(timer);
          setGameState('timeup');
        }
      }, 1000);
      
      // Store the timer in context.additionalData to be cleared later
      context.additionalData = { timer };
    };
    
    // Handle card flip
    const flipCard = (index: number) => {
      // Don't allow flipping if card is already flipped or matched
      if (flippedIndices.includes(index) || matchedIndices.includes(index)) {
        return;
      }
      
      // If we already have 2 cards flipped, reset them first before continuing
      if (flippedIndices.length === 2) {
        setFlippedIndices([index]);
        return;
      }
      
      // Flip the card
      const newFlippedIndices = [...flippedIndices, index];
      setFlippedIndices(newFlippedIndices);
      
      // If we've flipped 2 cards, check for a match
      if (newFlippedIndices.length === 2) {
        setMoves(moves + 1);
        const [firstIndex, secondIndex] = newFlippedIndices;
        
        // Check if the cards match
        if (cards[firstIndex] === cards[secondIndex]) {
          // Store recently matched cards for animation
          setRecentMatch([...newFlippedIndices]);
          setShowMatchAnimation(true);
          setMatchCount(matchCount + 1);
          
          // Clear animation after a delay
          setTimeout(() => {
            setShowMatchAnimation(false);
          }, 1000);
          
          // Add to matched indices
          const newMatchedIndices = [...matchedIndices, ...newFlippedIndices];
          setMatchedIndices(newMatchedIndices);
          setFlippedIndices([]);
          
          // Check if the game is won
          if (newMatchedIndices.length === cards.length) {
            // Clear the timer
            if (context.additionalData?.timer) {
              clearInterval(context.additionalData.timer);
            }
            
            // Update best score if applicable
            const finalTime = Math.floor((Date.now() - gameStartTime) / 1000);
            const currentBest = bestScore[difficulty];
            
            if (currentBest.moves === Infinity || 
                moves < currentBest.moves || 
                (moves === currentBest.moves && finalTime < currentBest.time)) {
              const newBestScore = {...bestScore};
              newBestScore[difficulty] = {moves, time: finalTime};
              setBestScore(newBestScore);
            }
            
            // Debug log to confirm win detection
            console.log("Game won! Transitioning to win screen...");
            
            // Immediate state change with no delay
            setGameState('won');
          }
        } else {
          // Significantly reduced flip back times for faster gameplay
          const flipBackDelay = difficulty === 'easy' ? 800 : 
                              difficulty === 'medium' ? 500 : 300;
          
          // Hide the cards after a short delay
          setTimeout(() => {
            setFlippedIndices([]);
          }, flipBackDelay);
        }
      }
    };
    
    // Reset game
    const resetGame = () => {
      // Clear the timer
      if (context.additionalData?.timer) {
        clearInterval(context.additionalData.timer);
      }
      setGameState('setup');
    };
    
    // Format time as mm:ss
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Custom button component
    const ThemedButton = ({
      children,
      onPress, 
      primary = false,
      small = false,
      disabled = false
    }: {
      children: Devvit.ElementChildren;
      onPress: () => void;
      primary?: boolean;
      small?: boolean;
      disabled?: boolean;
    }) => (
      <hstack 
        onPress={disabled ? undefined : onPress}
        backgroundColor={primary ? THEME.accent : 'transparent'}
        border={primary ? 'none' : 'thin'}
        borderColor={primary ? undefined : THEME.accent}
        padding={small ? "xsmall" : "small"}
        paddingLeft={small ? "small" : "medium"}
        paddingRight={small ? "small" : "medium"}
        cornerRadius="medium"
        opacity={disabled ? 0.5 : 1}
      >
        <text 
          weight="bold" 
          size={small ? "small" : "medium"}
          color={primary ? THEME.background : THEME.accent}
        >
          {children}
        </text>
      </hstack>
    );

    // Themed section container
    const Section = ({
      children,
      title
    }: {
      children: Devvit.ElementChildren;
      title?: string;
    }) => (
      <vstack 
        backgroundColor="rgba(255, 255, 255, 0.05)"
        padding="medium"
        cornerRadius="medium"
        width="95%"
        gap="medium"
      >
        {title && <text size="medium" weight="bold" color={THEME.textPrimary}>{title}</text>}
        {children}
      </vstack>
    );
    
    // Match animation component
    const MatchAnimation = () => {
      if (!showMatchAnimation) return null;
      
      return (
        <hstack
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          backgroundColor="rgba(3, 218, 198, 0.9)"
          padding="medium"
          paddingLeft="large"
          paddingRight="large"
          cornerRadius="large"
          border="medium"
          borderColor={THEME.accentSecondary}
          alignment="middle center"
          opacity={0.9}
          scale={1.2}
          zIndex={10}
        >
          <vstack alignment="middle center" gap="small">
            <text size="xlarge" weight="bold" color={THEME.background}>Match Found!</text>
            <text size="small" color={THEME.background}>+1 Pair</text>
          </vstack>
        </hstack>
      );
    };
    
    // Setup screen
    if (gameState === 'setup') {
      return (
        <blocks>
          <vstack 
            width="100%" 
            height="100%" 
            alignment="middle center" 
            gap="medium" 
            padding="medium"
            backgroundColor={THEME.background}
          >
            <vstack alignment="middle center" gap="small">
              <text size="xxlarge" weight="bold" color={THEME.accent}>Memory Game</text>
              <text color={THEME.textSecondary}>Match pairs of cards with the same symbol</text>
            </vstack>
            
            <Section title="Grid Size">
              <hstack gap="small" wrap="wrap" alignment="middle center">
                {[2, 4, 6, 8].map(size => (
                  <ThemedButton 
                    primary={gridSize === size}
                    onPress={() => setGridSize(size)}
                  >
                    {size}×{size}
                  </ThemedButton>
                ))}
              </hstack>
            </Section>
            
            <Section title="Difficulty">
              <hstack gap="small" alignment="middle center">
                {['easy', 'medium', 'hard'].map(diff => (
                  <ThemedButton 
                    primary={difficulty === diff}
                    onPress={() => setDifficulty(diff)}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </ThemedButton>
                ))}
              </hstack>
            </Section>
            
            {/* Display best scores if they exist */}
            {bestScore[difficulty].moves !== Infinity && (
              <Section title="Best Score">
                <vstack alignment="middle center">
                  <text color={THEME.accentSecondary} weight="bold">
                    {bestScore[difficulty].moves} moves in {formatTime(bestScore[difficulty].time)}
                  </text>
                  <text size="small" color={THEME.textSecondary}>
                    (Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})
                  </text>
                </vstack>
              </Section>
            )}
            
            <ThemedButton primary onPress={startGame}>
              Start Game
            </ThemedButton>
          </vstack>
        </blocks>
      );
    }
    
    // Win screen
    if (gameState === 'won') {
      const finalTime = Math.floor((Date.now() - gameStartTime) / 1000);
      const isNewBest = bestScore[difficulty].moves === moves &&
                        bestScore[difficulty].time === finalTime;
      
      return (
        <blocks>
          <vstack 
            width="100%" 
            height="100%" 
            alignment="middle center" 
            gap="large" 
            padding="large"
            backgroundColor={THEME.background}
          >
            <vstack alignment="middle center" gap="medium">
              <text size="xxlarge" weight="bold" color={THEME.accentSecondary}>You Win!</text>
              <text size="large" color={THEME.textPrimary}>
                ✨ Congratulations! ✨
              </text>
            </vstack>
            
            <Section>
              <vstack alignment="middle center" gap="medium">
                <hstack gap="large">
                  <vstack alignment="middle center">
                    <text color={THEME.textSecondary}>Moves</text>
                    <text size="xlarge" weight="bold" color={THEME.textPrimary}>{moves}</text>
                  </vstack>
                  <vstack alignment="middle center">
                    <text color={THEME.textSecondary}>Time</text>
                    <text size="xlarge" weight="bold" color={THEME.textPrimary}>{formatTime(finalTime)}</text>
                  </vstack>
                </hstack>
              </vstack>
            </Section>
            
            {isNewBest && (
              <vstack 
                backgroundColor="rgba(3, 218, 198, 0.15)" 
                padding="medium" 
                cornerRadius="medium"
                alignment="middle center"
              >
                <text weight="bold" color={THEME.accentSecondary}>New Best Score!</text>
              </vstack>
            )}
            
            <hstack gap="medium">
              <ThemedButton onPress={resetGame}>
                New Game
              </ThemedButton>
              <ThemedButton 
                primary
                onPress={() => {
                  // Start a new game with the same settings
                  startGame();
                }}
              >
                Play Again
              </ThemedButton>
            </hstack>
          </vstack>
        </blocks>
      );
    }
    
    // Time's up screen
    if (gameState === 'timeup') {
      return (
        <blocks>
          <vstack 
            width="100%" 
            height="100%" 
            alignment="middle center" 
            gap="large" 
            padding="large"
            backgroundColor={THEME.background}
          >
            <text size="xxlarge" weight="bold" color={THEME.error}>Time's Up!</text>
            
            <Section>
              <vstack gap="medium" alignment="middle center">
                <hstack width="100%" alignment="middle center" gap="large">
                  <vstack alignment="middle center">
                    <text color={THEME.textSecondary}>Matched</text>
                    <text size="xlarge" weight="bold" color={THEME.textPrimary}>
                      {matchedIndices.length / 2} / {cards.length / 2}
                    </text>
                    <text size="small" color={THEME.textSecondary}>pairs</text>
                  </vstack>
                  
                  <vstack alignment="middle center">
                    <text color={THEME.textSecondary}>Moves</text>
                    <text size="xlarge" weight="bold" color={THEME.textPrimary}>{moves}</text>
                  </vstack>
                </hstack>
              </vstack>
            </Section>
            
            {/* Calculate score based on matches and moves */}
            <vstack 
              backgroundColor="rgba(187, 134, 252, 0.15)" 
              padding="medium" 
              cornerRadius="medium" 
              width="95%"
            >
              <text weight="bold" size="large" alignment="center" color={THEME.accent}>
                Final Score
              </text>
              <text size="xxlarge" weight="bold" alignment="center" color={THEME.textPrimary}>
                {Math.round((matchedIndices.length / cards.length) * 1000 - (moves * 5))}
              </text>
              <text size="small" color={THEME.textSecondary} alignment="center">
                (Matches × 1000 - Moves × 5)
              </text>
            </vstack>
            
            <hstack gap="medium">
              <ThemedButton onPress={resetGame}>
                Main Menu
              </ThemedButton>
              <ThemedButton 
                primary
                onPress={() => {
                  // Start a new game with the same settings
                  startGame();
                }}
              >
                Try Again
              </ThemedButton>
            </hstack>
          </vstack>
        </blocks>
      );
    }
    
    // Game board
    // Adjust card size based on grid size to ensure it fits
    const maxSize = 240; // Reduced maximum container size to avoid border issues
    const cardSize = `${Math.min(Math.floor(maxSize / gridSize), 50)}px`;
    const fontSize = gridSize <= 4 ? "xxlarge" : gridSize <= 6 ? "xlarge" : "large";
    
    // Calculate progress
    const progressPercent = matchedIndices.length / cards.length * 100;
    
    // Calculate time remaining (120 seconds total)
    const timeRemaining = Math.max(0, 120 - timeElapsed);
    const timeRemainingPercent = (timeRemaining / 120) * 100;
    
    return (
      <blocks>
        <zstack width="100%" height="100%">
          <vstack 
            width="100%" 
            height="100%" 
            alignment="middle center" 
            gap="medium" 
            padding="medium"
            backgroundColor={THEME.background}
          >
            <hstack width="95%" alignment="middle space-between">
              <vstack gap="xsmall">
                <text weight="bold" color={THEME.textPrimary}>Moves: {moves}</text>
                <text color={THEME.textSecondary}>
                  Time: {formatTime(timeElapsed)} / 2:00
                </text>
              </vstack>
              
              <hstack gap="small">
                <ThemedButton small onPress={resetGame}>
                  Menu
                </ThemedButton>
                <ThemedButton 
                  primary
                  small
                  onPress={() => {
                    // Restart with same settings
                    startGame();
                  }}
                >
                  Restart
                </ThemedButton>
              </hstack>
            </hstack>
            
            {/* Progress bar */}
            <hstack width="95%" gap="small">
              <vstack width="47%" gap="xsmall">
                <text size="xsmall" color={THEME.textSecondary}>Progress</text>
                <hstack width="100%" height="6px" backgroundColor={THEME.progressBackground} cornerRadius="medium">
                  <hstack 
                    width={`${progressPercent}%`} 
                    height="100%" 
                    backgroundColor={THEME.accentSecondary} 
                    cornerRadius="medium" 
                  />
                </hstack>
              </vstack>
              
              <vstack width="47%" gap="xsmall">
                <text size="xsmall" color={THEME.textSecondary}>Time Remaining</text>
                <hstack width="100%" height="6px" backgroundColor={THEME.progressBackground} cornerRadius="medium">
                  <hstack 
                    width={`${timeRemainingPercent}%`} 
                    height="100%" 
                    backgroundColor={timeRemaining < 30 ? THEME.error : THEME.accent} 
                    cornerRadius="medium" 
                  />
                </hstack>
              </vstack>
            </hstack>
            
            {/* Difficulty indicator */}
            <hstack width="95%" alignment="start">
              <text size="xsmall" color={THEME.textSecondary}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} • {gridSize}×{gridSize} • {formatTime(timeRemaining)} left
              </text>
            </hstack>
            
            <vstack width="auto" gap="xsmall" alignment="middle center" padding="xsmall">
              {Array.from({ length: gridSize }).map((_, rowIndex) => (
                <hstack gap="xsmall">
                  {Array.from({ length: gridSize }).map((_, colIndex) => {
                    const index = rowIndex * gridSize + colIndex;
                    const isFlipped = flippedIndices.includes(index);
                    const isMatched = matchedIndices.includes(index);
                    const isRecentMatch = recentMatch.includes(index) && showMatchAnimation;
                    
                    // Different card styles based on state
                    let cardBg = THEME.cardBack;
                    if (isMatched) cardBg = THEME.cardMatched;
                    else if (isFlipped) cardBg = THEME.cardFront;
                    
                    return (
                      <zstack
                        width={cardSize}
                        height={cardSize}
                        onPress={() => flipCard(index)}
                      >
                        <vstack
                          width="90%"
                          height="90%"
                          border="thin"
                          borderColor={
                            isRecentMatch ? THEME.accentSecondary :
                            isMatched ? THEME.accentSecondary : 
                            isFlipped ? THEME.accent : 
                            'transparent'
                          }
                          cornerRadius="small"
                          backgroundColor={cardBg}
                          alignment="middle center"
                          scale={isRecentMatch ? 1.1 : 1}
                          opacity={isRecentMatch ? 0.9 : 1}
                          boxShadow={isRecentMatch ? `0 0 10px ${THEME.accentSecondary}` : "none"}
                        >
                          {(isFlipped || isMatched) && (
                            <text size={fontSize}>{cards[index]}</text>
                          )}
                        </vstack>
                      </zstack>
                    );
                  })}
                </hstack>
              ))}
            </vstack>
            
            {/* Match count */}
            <hstack 
              gap="xsmall" 
              backgroundColor="rgba(255, 255, 255, 0.05)" 
              padding="xsmall"
              paddingLeft="small"
              paddingRight="small"
              cornerRadius="medium"
            >
              <text size="small" color={THEME.textSecondary}>
                {matchedIndices.length / 2} of {cards.length / 2} pairs matched
              </text>
            </hstack>
          </vstack>
          
          {/* Match animation overlay */}
          <MatchAnimation />
        </zstack>
      </blocks>
    );
  }
})

Devvit.configure({
  redditAPI: true,
});

Devvit.addMenuItem({
  label: 'Play Memory Game',
  location: 'subreddit',
  onPress: async (_, { reddit, ui }) => {
    ui.showToast("Creating Memory Game post...");

    const subreddit = await reddit.getCurrentSubreddit();

    const post = await reddit.submitPost({
      preview: (
        <vstack padding="medium" cornerRadius="medium" backgroundColor="#121212">
          <text style="heading" size="medium" color="#BB86FC">
            Loading Memory Game...
          </text>
        </vstack>
      ),
      title: `Memory Game Challenge - Match the pairs!`,
      subredditName: subreddit.name,
    });

    ui.navigateTo(post);
  },
});

export default Devvit