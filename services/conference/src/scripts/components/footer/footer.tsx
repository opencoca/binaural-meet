import {BaseProps} from '@components/utils'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import Fab from '@material-ui/core/Fab'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import {makeStyles} from '@material-ui/core/styles'
import MoreIcon from '@material-ui/icons/ExpandMore'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import VideoIcon from '@material-ui/icons/Videocam'
import VideoOffIcon from '@material-ui/icons/VideocamOff'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

const useStyles = makeStyles((theme) => {
  return ({
    box: {
      position: 'absolute',
      bottom: 0,
      opacity: 0.1,
      '&:hover': {
        opacity: 1.0,
      },
    },
    margin: {
      margin: theme.spacing(1),
    },
    small: {
      transform: 'scale(0.5)',
      margin: '1.2em 0 0 -2.1em',
    },
  })
})


export const Footer: React.FC<BaseProps> = (props) => {
  const classes = useStyles()
  const participants = useParticipantsStore()

  const [micMenuEl, setMicMenuEl] = React.useState<Element|null>(null)
  const closeMicMenu = () => { setMicMenuEl(null) }
  const [videoMenuEl, setVideoMenuEl] = React.useState<Element|null>(null)
  const closeVideoMenu = () => { setVideoMenuEl(null) }
  const muteA = participants.local.get().plugins.streamControl.muteAudio
  const muteV = participants.local.get().plugins.streamControl.muteVideo

  return useObserver(() => (
    <div className={classes.box}>
      <Fab className={classes.margin} size = "small" color={muteA ? 'primary' : 'secondary' }
        aria-label="mic" onClick = { () => { participants.local.get().plugins.streamControl.muteAudio = !muteA }}>
        {muteA ? <MicOffIcon /> : <MicIcon /> }
      </Fab>
      <Fab className={classes.small} size="small"
        aria-label="micSelect" onClick = { () => { console.log('mic select') }}>
        <MoreIcon onClick = {(ev) => { setMicMenuEl(ev.currentTarget) }} />
      </Fab>
      <Menu
        id="simple-menu"
        anchorEl={micMenuEl}
        keepMounted={true}
        open={Boolean(micMenuEl)}
        onClose={closeMicMenu}
      >
        <MenuItem onClick={closeMicMenu}>Mic 1</MenuItem>
        <MenuItem onClick={closeMicMenu}>Mic 2</MenuItem>
        <MenuItem onClick={closeMicMenu}>Mic 3</MenuItem>
      </Menu>
      <Fab className={classes.margin} size = "small" color={muteV ? 'primary' : 'secondary'}
          aria-label="camera" onClick = { () => {
            participants.local.get().plugins.streamControl.muteVideo = !muteV
            console.log("muteV:", muteV)
          }
      }>
        {muteV ? <VideoOffIcon /> : <VideoIcon /> }
      </Fab>
      <Fab className={classes.small} size="small"
        aria-label="cameraSelect" onClick = { () => { console.log('camera select') }}>
        <MoreIcon onClick = {(ev) => { setVideoMenuEl(ev.currentTarget) }} />
      </Fab>
      <Fab className={classes.margin} size = "small" color={true ? 'secondary' : 'primary'}
        aria-label="share">
        <ScreenShareIcon />
      </Fab>
   </div>
  ))
}
Footer.displayName = 'Footer'
