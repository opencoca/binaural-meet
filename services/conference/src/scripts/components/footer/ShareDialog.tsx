import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemText from '@material-ui/core/ListItemText'
import ScreenShare from '@material-ui/icons/ScreenShare'
import React from 'react'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
}

export const ShareDialog: React.FC<ShareDialogProps> = (props) => {
  const {
    open,
    onClose,
  } = props

  return  <Dialog open={open} onClose={onClose} >
    <DialogTitle id="simple-dialog-title">Share</DialogTitle>
    <List>
      <ListItem button key="shareScreen">
        <ListItemAvatar>
          <ScreenShare />
        </ListItemAvatar>
        <ListItemText>
          Share Screen
        </ListItemText>
      </ListItem>
    </List>
  </Dialog>
}