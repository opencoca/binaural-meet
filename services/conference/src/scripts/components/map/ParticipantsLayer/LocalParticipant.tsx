import {MoreButton, moreButtonControl, MoreButtonMember} from '@components/utils/MoreButton'
import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import Popover from '@material-ui/core/Popover'
import {makeStyles} from '@material-ui/core/styles'
import {addV2, assert, mulV2, rotateVector2DByDegree, subV2, transformPoint2D, transfromAt} from '@models/utils'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {DragHandler, DragState} from '../../utils/DragHandler'
import {KeyHandlerPlain} from '../../utils/KeyHandler'
import {MAP_SIZE} from '../Base/Base'
import {useValue as useTransform} from '../utils/useTransform'
import {ConfigForm} from './LocalConfig/ConfigForm'
import {Participant, ParticipantProps} from './Participant'

const AVATAR_SPEED_LIMIT = 50
const MAP_SPEED_LIMIT = 200
const HALF_DEGREE = 180
const WHOLE_DEGREE = 360
const HALF = 0.5


type LocalParticipantProps = ParticipantProps

interface StyleProps {
  position: [number, number],
  size: number,
}

const useStyles = makeStyles({
  more: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size * 0.5 ,
    height: props.size * 0.5,
    left: props.position[0] + props.size * 0.4,
    top: props.position[1] - props.size * 0.8,
  }),
})

interface LocalParticipantMember extends MoreButtonMember{
  smoothedDelta: [number, number]
  scrollAgain: boolean
}
const LocalParticipant: React.FC<LocalParticipantProps> = (props) => {
  const participants = useStore()
  const participant = participants.local
  assert(props.participantId === participant.id)
  const map = useMapStore()
  const transform = useTransform()
  const member = useRef<LocalParticipantMember>(new Object() as LocalParticipantMember).current


  const moveParticipant = (state: DragState<HTMLDivElement>) => {
    //  move local participant
    let delta = subV2(state.xy, map.toWindow(participant!.pose.position))
    const norm = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
    if (norm > AVATAR_SPEED_LIMIT) {
      delta = mulV2(AVATAR_SPEED_LIMIT / norm, delta)
    }

    if (participants.local.thirdPersonView) {
      const localDelta = transform.rotateG2L(delta)
      participant!.pose.position = addV2(participant!.pose.position, localDelta)
      const SMOOTHRATIO = 0.8
      if (!member.smoothedDelta) { member.smoothedDelta = [delta[0], delta[1]] }
      member.smoothedDelta = addV2(mulV2(1 - SMOOTHRATIO, localDelta), mulV2(SMOOTHRATIO, member.smoothedDelta))
      const dir = Math.atan2(member.smoothedDelta[0], -member.smoothedDelta[1]) * HALF_DEGREE / Math.PI
      let diff = dir - participant!.pose.orientation
      if (diff < -HALF_DEGREE) { diff += WHOLE_DEGREE }
      if (diff > HALF_DEGREE) { diff -= WHOLE_DEGREE }
      const ROTATION_SPEED = 0.2
      participant!.pose.orientation += diff * ROTATION_SPEED
    } else {
      participant!.pose.position = addV2(transform.rotateG2L(delta), participant!.pose.position)
    }
    participant.savePhysicsToStorage(false)
  }
  const moveParticipantByKey = (keys:Set<string>) => {
    let deltaF = 0
    let deltaA = 0
    const VEL = 10
    const ANGVEL = 5
    let relatedKeyPressed = false
    if (keys.has('ArrowUp') || keys.has('KeyW')) {
      deltaF = VEL
      relatedKeyPressed = true
    }
    if (keys.has('ArrowDown') || keys.has('KeyS')) {
      deltaF = -VEL * HALF
      relatedKeyPressed = true
    }
    if (keys.has('ArrowLeft') || keys.has('KeyA') || keys.has('KeyQ')) {
      deltaA = -ANGVEL
      relatedKeyPressed = true
    }
    if (keys.has('ArrowRight') || keys.has('KeyD') || keys.has('KeyE')) {
      deltaA = ANGVEL
      relatedKeyPressed = true
    }
    if (keys.has('ShiftLeft') || keys.has('ShiftRight')) {
      deltaA *= 2
      deltaF *= 2
    }
    let newA = participant!.pose.orientation + deltaA
    if (newA > HALF_DEGREE) { newA -= WHOLE_DEGREE }
    if (newA < -HALF_DEGREE) { newA += WHOLE_DEGREE }
    participant.pose.orientation = newA
    if (!participants.local.thirdPersonView) {
      const center = transformPoint2D(map.matrix, participants.local.pose.position)
      const changeMatrix = (new DOMMatrix()).rotateSelf(0, 0, -deltaA)
      const newMatrix = transfromAt(center, changeMatrix, map.matrix)
      map.setMatrix(newMatrix)
      map.setCommittedMatrix(newMatrix)
    }
    const delta = rotateVector2DByDegree(participant!.pose.orientation, [0, -deltaF])
    //  console.log(participant!.pose.position, delta)
    const newPos = addV2(participant!.pose.position, delta)
    if (newPos[0] < -MAP_SIZE * HALF) { newPos[0] = -MAP_SIZE * HALF }
    if (newPos[0] > MAP_SIZE * HALF) { newPos[0] = MAP_SIZE * HALF }
    if (newPos[1] < -MAP_SIZE * HALF) { newPos[1] = -MAP_SIZE * HALF }
    if (newPos[1] > MAP_SIZE * HALF) { newPos[1] = MAP_SIZE * HALF }
    participant.pose.position = newPos
    participant.savePhysicsToStorage(false)

    return relatedKeyPressed
  }

  const scrollMap = () => {
    const posOnScreen = map.toWindow(participant!.pose.position)
    const target = [posOnScreen[0], posOnScreen[1]]
    const RATIO = 0.2
    const left = map.left + map.screenSize[0] * RATIO
    const right = map.left +  map.screenSize[0] * (1 - RATIO)
    const bottom = map.screenSize[1] * (1 - RATIO)
    const top = participants.local.thirdPersonView ? map.screenSize[1] * RATIO : bottom
    if (target[0] < left) { target[0] = left }
    if (target[0] > right) { target[0] = right }
    if (target[1] < top) { target[1] = top }
    if (target[1] > bottom) { target[1] = bottom }
    let diff = subV2(posOnScreen, target) as [number, number]
    const norm = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1])
    if (norm > MAP_SPEED_LIMIT) {
      diff = mulV2(MAP_SPEED_LIMIT / norm, diff) as [number, number]
    }
    const SCROOL_SPEED = 0.1
    const mapMove = mulV2(SCROOL_SPEED, map.rotateFromWindow(diff) as [number, number])
    const EPSILON = 0.2
    if (Math.abs(mapMove[0]) + Math.abs(mapMove[1]) > EPSILON) {
      const newMat = map.matrix.translate(-mapMove[0], -mapMove[1])
      const trans = map.rotateFromWindow([newMat.e, newMat.f])
      const HALF = 0.5
      let changed = false
      if (trans[0] < -MAP_SIZE * HALF) { trans[0] = -MAP_SIZE * HALF; changed = true }
      if (trans[0] > MAP_SIZE * HALF) { trans[0] = MAP_SIZE * HALF; changed = true }
      if (trans[1] < -MAP_SIZE * HALF) { trans[1] = -MAP_SIZE * HALF; changed = true }
      if (trans[1] > MAP_SIZE * HALF) { trans[1] = MAP_SIZE * HALF; changed = true }
      const transMap = map.rotateToWindow(trans);
      [newMat.e, newMat.f] = transMap
      map.setMatrix(newMat)
      map.setCommittedMatrix(newMat)
      member.scrollAgain = !changed

      return !changed
    }

    return false
  }
  const onTimer = (state:DragState<HTMLDivElement>) => {
    if (state.dragging) {
      onDrag(state)
    }
    const rv = scrollMap()
    //  console.log(`onTimer: drag:${state.dragging} again:${rv}`)

    return rv
  }
  const onDrag = (state:DragState<HTMLDivElement>) => {
    //  console.log('participant onDrag')
    moveParticipant(state)
    scrollMap()
  }
  const onKeyTimer = (keys:Set<string>) => {
    //   console.log('onKeyTimer()', keys)
    const participantMoved = moveParticipantByKey(keys)

    if (member.scrollAgain || participantMoved) {
      return scrollMap()
    }

    return false
  }
  const keycodesUse = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyS', 'KeyD'])
  const unused = new KeyHandlerPlain(onKeyTimer, 33, keycodesUse, keycodesUse, () => (map.keyInputUsers.size === 0))

  //  pointer drag
  const TIMER_INTERVAL = 33
  const drag = new DragHandler<HTMLDivElement>(onDrag, 'draggableHandle',
                                               onTimer, TIMER_INTERVAL, () => { setShowConfig(true) })
  useEffect(() => {
    drag.target.current?.focus({preventScroll:true})
  })

/*  rotation changes sound localization and frequent changes are not good to hear.
  //  Rotate participant to look at the pointer
  useEffect(() => {
    const cleanup = reaction(() => mapData.mouse, (mouse) => {
      //  look at mouse
      if (participant.thirdPersonView && !drag.memo?.state?.dragging) {
        const dir = subV2(mapData.mouseOnMap, participant.pose.position)
        const norm = normV(dir)
        if (norm > PARTICIPANT_SIZE / 2) {
          participant.pose.orientation = Math.atan2(dir[0], -dir[1]) * HALF_DEGREE / Math.PI
        }
      }
    })

    return cleanup
  },
            [])
*/
  const styleProps = useObserver(() => ({
    position: participant.pose.position,
    size: props.size,
  }))
  const [color, textColor, revColor] = participant ? participant.getColor() : ['white', 'black']
  const classes = useStyles(styleProps)
  const [showMore, setShowMore] = React.useState(false)
  const [showConfig, setShowConfig] = React.useState(false)
  const moreControl = moreButtonControl(setShowMore, member)
  function closeConfig() {
    setShowConfig(false)
    map.keyInputUsers.delete('LocalParticipantConfig')
  }
  function openConfig() {
    setShowConfig(true)
    map.keyInputUsers.add('LocalParticipantConfig')
  }
  const ref = useRef<HTMLButtonElement>(null)

  return (
    <div ref={drag.target} {...drag.bind()} {...moreControl}
    >
    <Participant {...props}
      onContextMenu={(ev) => {
        ev.preventDefault()
        openConfig()
      }
    }
/>
    <MoreButton show={showMore} className={classes.more} htmlColor={color} {...moreControl}
      buttonRef = {ref}
      onClickMore = {openConfig} />,
    <Popover open={showConfig} onClose={closeConfig}
      anchorEl={ref.current} anchorOrigin={{vertical:'top', horizontal:'left'}}
      anchorReference = "anchorEl"
    >
      <ConfigForm close={closeConfig} />
    </Popover>
    </div>
  )
}

export const MemoedLocalParticipant = memoComponent(LocalParticipant, ['participantId', 'size'])
MemoedLocalParticipant.displayName = 'MemorizedLocalParticipant'
