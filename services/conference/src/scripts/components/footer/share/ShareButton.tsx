import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import {makeStyles} from '@material-ui/styles'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {FabMain} from '../FabNoFocus'
import {ShareDialog} from './ShareDialog'

const useStyles = makeStyles({
  root: {
    display: 'inline-block',
  },
})

export const ShareButton: React.FC = () => {
  const [openDialog, setOpenDialogRaw] = useState<boolean>(false)
  const classes = useStyles()
  const store = useContentsStore()
  const sharing = useObserver(() => store.tracks.localMains.size + store.tracks.localContents.size)
  const map = useMapStore()
  function setOpenDialog(flag: boolean) {
    if (flag) {
      map.keyInputUsers.add('shareDialog')
    }else {
      map.keyInputUsers.delete('shareDialog')
    }
    setOpenDialogRaw(flag)
  }
  //  keyboard shortcut
  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (map.keyInputUsers.size === 0) {
        if (e.code === 'KeyC') {  //  Create share dialog
          setOpenDialog(true)
        }
      }
    }
    window.addEventListener('keypress', onKeyPress)

    return () => {
      window.removeEventListener('keypress', onKeyPress)
    }
  },        [])

  return (
    <div className={classes.root}>
      <FabMain color={sharing ? 'secondary' : 'primary'}
        aria-label="share" onClick={() => setOpenDialog(true)}>
        <ScreenShareIcon fontSize="large" />
      </FabMain>
      <ShareDialog open={openDialog} onClose={() => setOpenDialog(false)} />
    </div>
  )
}

ShareButton.displayName = 'ShareButton'
