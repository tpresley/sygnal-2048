'use strict'

import { component, collection, xs, ABORT } from 'sygnal'
import { addTile, shift, hasValidMove } from './lib/utils'
import tile from './tile'

// key value constants
const UP    = 'ArrowUp'
const DOWN  = 'ArrowDown'
const LEFT  = 'ArrowLeft'
const RIGTH = 'ArrowRight'

// delay after a move before a new tile is added to the board
const NEW_TILE_DELAY = 100

// initial app state
// - this can be set directly as a parameter of component()
//   but storing it in a variable allows us to 'restart' the game
//   by passing the initial state to a reducer
const initialState = {
  tiles: [],
  over: false,
  max: 2,
  score: 0,
  locked: false,
}


export default component({
  // the 'name' parameter is used in debug messages
  // to see debug messages, open the console and set DEBUG = true
  name: 'BOARD',

  // use the initial state from above
  initialState,

  // the 'calculated' parameter will add each listed key as a value in the app state
  // - each key takes a reducer function as its value
  // - the reducers get the current application state, and should return the value for the calculated field
  //
  // NOTE: avoid using one calculated field in the calculation of another as this can have unpredictable results
  //       at minimum this will cause a delay in the correct value being calculated until a 2nd state update
  calculated: {
    // calculate the largest tile by filtering out deleted tiles, then reducing to find the biggest value
    // results in the value of the largest non-deleted tile on the board
    max:  (state) => state.tiles.filter(tile => tile && !tile.deleted).reduce((acc, tile) => (acc > tile.value) ? acc : tile.value, 0),
    // calculate if the user has lost the game by filtering out deleted tiles, seeing if the board is full (has 16 tiles on it)
    // and that there are no valid moves the user can make.. results in true or false
    lost: (state) => !state.over && state.tiles.filter(tile => !tile.deleted).length === 16 && !hasValidMove(state.tiles)
  },


  // the 'model' parameter has one key for each 'action' the component can perform
  // - 'actions' are calls to cause a 'side effect'
  //   this can be updating state, making an HTTP request, playing a sound, or anything else
  // - if an 'action' is provided a function, it will be treated as a 'state reducer'
  //   which receives 3 inputs (state, data, and next)
  // - 'state' is the current state when the action is triggered
  // - 'data' is whatever data was passed by the triggering stream (see 'intent' below)
  // - 'next' is a function allowing you to call another action after the current one completes
  //   and takes the name of the next action, and optionally data to pass to the action
  // - the 'next' function can be called multiple times, and can be delayed (via setTimeout for example)
  model: {

    // restart the game
    RESTART:  (state, data, next) => {
      // after the current action completes, fire ADD_TILE twice to add two new tiles to the empty board
      next('ADD_TILE')
      next('ADD_TILE')

      // reset the state to the iniital state
      return { ...initialState }
    },

    // process a user move (UP, DOWN, LEFT, or RIGHT)
    MOVE:     (state, data, next) => {
      // if the game is currently 'locked' (waiting to add a new tile after a move)
      // or the game is over, then abort the action by returning the special ABORT constant
      if (state.locked || state.over) return ABORT

      // move the tiles in the direction the user pressed
      // NOTE: 'data' is the value of the initiating stream, and will be
      //       'UP', 'DOWN', 'LEFT', or 'RIGHT' in this case
      const tiles = shift(state.tiles, data)

      // if no tiles were able to move on the board, the shift() function returns boolean 'false'
      // in that case, abort the action by returning the special ABORT constant
      if (!tiles) return ABORT

      // points are scored when tiles are merged after a move, and the number of points gained
      // is the value of the new merged tile
      // - since when tiles are merged, one of the pair is marked for deletion, we can calculate
      //   new points gained by looking for tiles marked for deletion and summing up their values
      const newPoints = tiles.filter(tile => tile.deleted).reduce((acc, tile) => acc + tile.value, 0)

      // pause a bit then add a new tile to the board
      setTimeout(_ => {
        next('ADD_TILE')
      }, NEW_TILE_DELAY)

      // return the updated the state
      // - set 'locked' to true to prevent user moves until a new tile is added to the board
      return { ...state, tiles, score: state.score + newPoints, locked: true }
    },

    // add a new tile to the board
    ADD_TILE: (state, data) => {
      // addTile() takes the current tiles, and returns a new array containing a new tile
      const newTiles = addTile(state.tiles)

      // return the updated state, and unlock so the user can move again
      return { ...state, tiles: newTiles, locked: false }
    },

    // update state when the game ends
    GAME_OVER: (state, data) => ({ ...state, over: true, won: data }),

  },


  // the 'intent' parameter receives an object containing a 'source' for each
  // driver added in the 'run()' call that initiated the application
  // - Sygnal's run() function automatically adds drivers for:
  //   + STATE
  //   + DOM
  //   + EVENTS
  //   + LOG
  // - additional drivers (for networking for example) can be added in the 2nd parameter of 'run()'
  intent: ({ STATE, DOM }) => {
    // the DOM source has .select() and .events() methods for listening to user actions in the browser
    // the .select() method can be passed any valid CSS selector to locate DOM elements
    // it is convention to use class names, but HTML id's or attribute selectors work just as well
    // the .events() method takes any valid DOM event ('click', 'input', 'keydown' etc.)
    // or any custom events you create and dispatch yourself
    // the result of .events() is an observable stream that emits the DOM event when they happen

    // if components are configured to be 'isolated' (using the 'isolateOpts' paremeter) then
    // DOM events will be limited to DOM elements INSIDE the current component
    // to 'break out' of the isolated scope, use DOM.select('document') to access the entire page
    // - after DOM.select('document') adding additional .select()'s will target ALL elements
    //   on the page that match the CSS selector
    // NOTE: items in a collection() comoponent are automatically isolated, so to access any
    //       DOM events outside the item component itself, use the method above

    // capture all user keydown events in the browser window, and extract the 'key' from the event object
    const allKey$   = DOM.select('document').events('keydown').map(e => e.key)

    // simple helper to determine if the current key pressed matches the specified key
    const keyFilter = (key) => (pressed) => pressed === key

    // filter all user key presses to only up, down, left, and right
    // and map each occurence to the strings UP, DOWN, LEFT, and RIGHT
    // NOTE: .mapTo() will emit the specified value EVERY time the stream fires,
    //       regardless of the value the stream itself emits
    const up$    = allKey$.filter(keyFilter(UP)).mapTo('UP')
    const down$  = allKey$.filter(keyFilter(DOWN)).mapTo('DOWN')
    const left$  = allKey$.filter(keyFilter(LEFT)).mapTo('LEFT')
    const right$ = allKey$.filter(keyFilter(RIGTH)).mapTo('RIGHT')

    // merge the filtered key presses together into a single stream containing UP, DOWN, LEFT or RIGHT
    // depending on what the user pressed
    const move$  = xs.merge(up$, down$, left$, right$)

    // the STATE source has a .stream property which is the raw stream that emits the current state
    // whenever the state is updated

    // filter the raw state for any time the game is not already 'over' and the largest tile
    // on the board has a value of 2048 (the user won the game)
    // the resulting stream will emit ONCE when the user wins the game, and will emit the boolean 'true'
    // NOTE: state.max is a calculated value (from the 'calculated' parameter above)
    const won$       = STATE.stream.filter(state => !state.over && state.max === 2048).mapTo(true)

    // filter the raw state and emit when the user has lost (state.lost === true)
    // the resulting stream will emit the boolean 'false'
    // NOTE: state.lost is a calculated value (from the 'calculated' parameter above)
    const lost$      = STATE.stream.filter(state => state.lost === true).mapTo(false)

    // merge the win and loss streams into a single stream that emits 'true' when the user wins,
    // and 'false' when they lose
    const gameOver$  = xs.merge(won$, lost$)

    // look for when the user clicks on either the restart button (.restart),
    // or the 'Game Over' notification (.gameover)
    const restart$   = DOM.select('.restart, .gameover').events('click')

    // create a new stream from an array that emits once for each value of the array
    // this new stream will determine the first tiles added to the board when the game starts
    // the actual values are ignored, only the length of the array matters.
    // if you change the number of items in the array, the number of initial tiles will change
    const firstTile$ = xs.fromArray([1,2])


    // map the streams we created above to 'action' names that will happen when those streams fire
    // - when these streams fire:
    //   1) the 'action' defined in the model parameter with the same name will be executed
    //   2) any data provided by the stream will be passed to the 2nd parameter of the action handler
    // - it is convention to use ALL_CAPS for 'action' names, but any valid Javascript key name will work
    //   (including JS Symbols!) as long as the names here match those in 'model'
    // NOTE: each 'action' can only be specified once, so if multiple streams can initiate the same action
    //       you will need to use xs.merge(), xs.combine(), or some other method to create a single stream
    //       to pass to the action
    return {
      RESTART:   restart$,
      GAME_OVER: gameOver$,
      MOVE:      move$,
      ADD_TILE:  firstTile$,
    }
  },


  // the 'view' parameter receives the current state along with any sub-components defined in the 'chidren' parameter (below)
  // the state is always accessible through the 'state' key, and is also aliased to the state driver name ('STATE' by default)
  // - this function must return Virtual DOm elements
  // - this can be done either using JSX (as below), or by using Preact style Virtual DOM helpers imported from @cycle/dom
  //   under the hood @cycle/dom helpers use Snabbdom, an extremely small and fast virtual DOM library
  view: ({ state, tiles }) => {
    // use destrucuring to get both native and calculated values from the current state
    const { score, max, over, won } = state

    // return the DOM
    return (
      <div className='container'>
        <h1>Sygnal 2048</h1>
        {/* show the current biggest tile on the board */}
        <div className="info">
          <div className="largest">Largest: { max }</div>
          <div className="score">Score: { score }</div>
        </div>
        <div className="board-container">
          <div className='slot-board'>
            {/* normal JS loops and logic work as normal! */}
            { Array(16).fill().map(_ => <div className="slot"></div>) }
          </div>
          <div className='tile-board'>
            {/* display the 'tiles' sub-component defined in the 'children' parameter below */}
            { tiles }
          </div>
          {/* if the game is over, and the user won... */}
          { over && won &&
            <div className="gameover won" >
              <span className="won-message">YOU WON!!</span>
            </div>
          }
          {/* if the game is over, and the user lost... */}
          { over && !won &&
            <div className="gameover lost" >
              <span className="lost-message">GAME OVER</span>
            </div>
          }
        </div>
        <div className="restart-container"><input type="button" className="restart" value="Start Over" /></div>
      </div>
    )
  },


  // the 'children' parameter is one way to use sub-components in Sygnal
  // - takes an object mapping any valid Sygnal or Cycle.js component to a name
  // - the key name will be used when passing the rendered component to the 'view' function
  // - because collection() and switchable() result in valid Sygnal components, you can pass
  //   either directly to an entry in 'children' as below
  children: {
    // add a sub-component name 'tiles' that is a collection of 'tile' components
    // - the key name becomes the sub-component's name
    // - the 1st argument of collection() is a Sygnal or Cycle.js component to make a collection of
    // - the 2nd argument of collection() can either be a string matching a property on the state containing an array
    //   OR a state 'lense' which is an object with 'get' and 'set' properties for returning an array from the current state
    // - in this case, collection() will look at state.tiles, and instantiate a tile component for each element of that array
    // - the resulting Cycle.js sinks will be automatically linked up correctly to the current component
    //   and the resulting virtual DOM will be provided as a property of the 1st argument to this component's view() function
    // - each item in the collection is automatically 'isolated', meaning by default it will only have access to its onw DOM
    //   and will only see (and be able to set) its own state
    tiles: collection(tile, 'tiles', { container: null })
  }

})
