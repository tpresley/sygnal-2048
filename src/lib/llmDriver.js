import { xs } from 'sygnal'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_KEY || ''

// The OpenAI model to use: gpt-3.5-turbo, gpt-4-turbo, etc
const OPEN_AI_MODEL = 'gpt-3.5-turbo'

// Ollama model to use... you will need Ollama installed, and use 'ollama pull' to download your models, then put the name here
const OLLAMA_MODEL = 'mixtral:instruct'

const MAX_RETRIES = 10

const SYSTEM_PROMPT = `
You are a game-playing system for 2048, tasked with finding the optimal move. The 4x4 board is represented as a nested array with 4 row entries, each containing 4 integers for each position in the row, and where each integer is a tile's value (all powers of 2) and 0 means an empty cell. 
The first element of the first row array corresponds to the top-left corner, proceeding left to right across each row (e.g. the first element in each row array is the left most tile of that row, and the 4th element is the right most tile).

In each move, you can shift tiles in one of four directions: UP, DOWN, LEFT, or RIGHT.  
Tiles slide toward the chosen direction, and adjacent tiles of the same value merge to form a new tile with double the original value (all tiles will have values that are a power of 2: 2, 4, 8, 16...).  
Tiles with different values do not merge, and will stack up from the far side of the board in the chosen direction in the same order, but with no empty spaces between them.  
Tiles merge from the farthest side toward the nearest, and each tile can merge only once per move.  
The shape of the board does not change based on your moves, only the tiles on the board move and merge in the chosen direction, leaving a 4x4 board with the appropriate changes to tiles shifted or merged on top of the board.
At the beginning of the game, 2 tiles with value 2 or 4 are placed randomly on the board.  
After each move, a new tile with value 2 or 4 is added to a random empty cell.  

The game ends when you create a tile with a value of 2048 through merges (you win), or when there are no empty cells and no valid moves (you lose). 

**Important Rules:**
1. Choose a direction that results in tiles either moving or merging, avoiding any move that leaves the board unchanged.

Examples of attempted moves which result in no changes (bad moves):
If the board is [[0, 0, 2, 4], [0, 0, 0, 8], [0, 8, 2, 4], [0, 0, 0, 4]], making a move to the RIGHT would not result in any tiles moving or merging. 
If the board is [[0, 0, 0, 0], [0, 0, 0, 8], [2, 0, 2, 16], [4, 0, 4, 8]], making a move to the DOWN would not result in any tiles moving or merging.

Examples of valid moves (good moves):
If the board is [[0, 0, 0, 0], [0, 0, 0, 8], [2, 0, 2, 16], [4, 0, 4, 8]], making a move to the LEFT would result in the board being [[0, 0, 0, 0], [8, 0, 0, 0], [4, 16, 0, 0], [8, 8, 0, 0]].  
If the board is [[2, 2, 2, 0], [0, 4, 4, 4], [8, 16, 0, 16], [2, 2, 2, 2]], making a move to the RIGHT would result in the board being [[0, 0, 2, 4], [0, 0, 4, 8], [0, 0, 8, 32], [0, 0, 4, 4]].  
If the board is [[2, 2, 2, 0], [2, 4, 4, 4], [8, 16, 4, 16], [2, 2, 0, 0]], making a move to the DOWN would result in the board being [[0, 2, 0, 0], [2, 4, 0, 0], [8, 16, 2, 4], [2, 2, 8, 16]].

**Strategies:**
1. **Merge Largest Tiles:** Focus on merging high-value tiles to gain points.
2. **Maximize Merges:** Pick moves that merge multiple tiles in one action.
3. **Position High-Value Tiles:** Aim to keep high-value tiles in corners for easier merging.
4. **Plan Ahead:** Consider the impact on future moves, aligning tiles to set up successive merges.

Analyze what would happen if you moved in each direction, then based on your analysis choose the best move.  

Return your answer in a JSON object formatted like:  
{ "ifUp": "???", "ifDown": "???", "ifLeft": "???", "ifRight": "???", "direction": "UP", "reason": "Why this is the best move" }  

where ifUp, ifDown, ifLeft, and ifRight are your analysis of what would happen if you moved UP, DOWN, LEFT, and RIGHT, the direction is the direction you would like to move, and the reason is why you decide in that direction.
For your analysis and reason, keep your answers brief, under 20 words if possible, and as precise as possible.  
Possible values for "direction" are "UP", "DOWN", "LEFT", or "RIGHT". Ensure your choice results in tile movement or merging.

----------------
`

const functionSchema = {
  "name": "get_direction",
  "description": "Provides a direction",
  "parameters": {
      "type": "object",
      "properties": {
          "direction": {
              "type": "string",
              "enum": ["UP", "DOWN", "LEFT", "RIGHT"],
              "description": "The direction to be returned"
          },
          "reason": {
            "type": "string",
            "description": "The reason why that direction was chosen"
          },
          "ifUp": {
            "type": "string",
            "description": "What would happen if you moved UP"
          },
          "ifDown": {
            "type": "string",
            "description": "What would happen if you moved DOWN"
          },
          "ifLeft": {
            "type": "string",
            "description": "What would happen if you moved LEFT"
          },
          "ifRight": {
            "type": "string",
            "description": "What would happen if you moved RIGHT"
          },
      },
      "required": ["direction", "reason", "ifUp", "ifDown", "ifLeft", "ifRigth"]
  }
}

export default function LlmDriver() {
  return (fromComponent$) => {
    const toComponent$ = xs.create({
      start: (listener) => {
       fromComponent$.subscribe({
          next: async (input) => {
            const { board: currentBoard, avoid: directionsToAvoid, agent } = input
            let finished = false
            let move
            let tries = 0

            const callFunc = agent === 'openai' ? callOpenAi : callOllama

            while (!finished && tries < MAX_RETRIES) {
              try {
                move = await callFunc(currentBoard, directionsToAvoid)
                finished = true
              } catch (e) {
                tries += 1
                console.log('Invalid response from AI:', e.message)
              }
            }

            listener.next({ agent, move: move.direction.toUpperCase(), reason: move.reason })
          }
        })
      },
      stop: () => {}
    })

    return toComponent$
  }
}

async function callOpenAi(board, avoid) {
  let prompt = `Current Board: ${ board }\n`
  if (avoid) {
    prompt += ` Avoid using the following directions: ${avoid}  \n`
  }
  prompt += `Next Move:  \n`
  const content = {
    model: OPEN_AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    functions: [functionSchema],
    function_call: {name: "get_direction"}
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ OPENAI_API_KEY }`
    },
    body: JSON.stringify(content)
  })

  const unwrapped = JSON.parse((await response.json()).choices[0].message.function_call.arguments)

  return unwrapped
}

async function callOllama(board, avoid) {
  let prompt = `Current Board: ${ board }\n`
  if (avoid) {
    prompt += ` Avoid using the following directions: ${avoid}  \n`
  }
  prompt += `Next Move: `
  const content = {
    model: OLLAMA_MODEL,
    system: SYSTEM_PROMPT,
    prompt: prompt,
    format: 'json',
    stream: false
  }

  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(content),
  })

  const unwrapped = JSON.parse((await response.json()).response)

  return unwrapped
}

