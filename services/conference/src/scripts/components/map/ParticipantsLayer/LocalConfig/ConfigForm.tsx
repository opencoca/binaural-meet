import {useStore} from '@hooks/ParticipantsStore'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import {uploadToGyazo} from '@models/api/Gyazo'
import {defaultInformation} from '@models/Participant'
import React, {useState} from 'react'
import {ViewpointControl} from './ViewpointControl'

function useInput<T>(initialValue:T) {
  const [value, set] = useState(initialValue)

  function handler(e:React.ChangeEvent<HTMLInputElement>) {
    (set as any)(e.target.value)
  }

  return {value, set, args: {value, onChange: handler}}
}
export interface ConfigFormProps{
  close?: () => void,
}

export const ConfigForm: React.FC<ConfigFormProps> = (props: ConfigFormProps) => {
  const [submitType, setSubmitType] = useState('')
  const participants = useStore()
  const local = participants.local
  const name = useInput(local.information.name)
  const email = useInput(local.information.email)
  const [file, setFile] = useState<File|null>()

  function submitHandler(ev: React.FormEvent) {
    ev.preventDefault()
    if (submitType === 'clearAvatarSrc') {
      setFile(null)
      local.information.avatarSrc = undefined

      return
    }

    if (props.close) { props.close() }
    if (submitType === 'cancel') { return }
    if (submitType === 'clear') {
      localStorage.removeItem('localParticipantInformation')
      sessionStorage.removeItem('localParticipantInformation')
      name.set(defaultInformation.name)
      email.set(defaultInformation.email)
      setFile(null)
      local.setInformation(defaultInformation)

      return
    }
    const info = Object.assign({}, defaultInformation)
    info.name = name.value
    info.email = email.value
    info.avatarSrc = local.information.avatarSrc

    if (file) {
      uploadToGyazo(file).then(({url, size}) => {
        info.avatarSrc = url
        local.setInformation(info)
        console.log(`info.avatar = ${local.information.avatarSrc}`)
        local.saveInformationToStorage(submitType === 'local')
      })
    }else {
      local.setInformation(info)
      local.saveInformationToStorage(submitType === 'local')
    }
  }

  const form = <form key="information" onSubmit = {submitHandler} style={{lineHeight:'2em'}}>
    Name: <input type="text" {...name.args} /> <br />
    Avatar image file : &nbsp;
    {local.information.avatarSrc ?
      <> <img src={local.information.avatarSrc} style={{height:'1.5em', verticalAlign:'middle'}} />
      <input type="submit" onClick={() => setSubmitType('clearAvatarSrc')} value="✕" /> &nbsp; </>
       : undefined}
    <input type="file" onChange={(ev) => {
      setFile(ev.target.files?.item(0))
    }} /> <br />
    Email for Gravatar: <input type="text" {...email.args} /> <br />
    <input type="submit" onClick={() => setSubmitType('session')} value="Save" /> &nbsp;
    <input type="submit" onClick={() => setSubmitType('local')} value="Save to browser" /> &nbsp;
    <input type="submit" onClick={() => setSubmitType('clear')} value="Clear" />&nbsp;
    <input type="submit" onClick={() => setSubmitType('cancel')} value="Cancel" />
  </form>

  return <>
    <DialogTitle>Avatar's setting</DialogTitle>
    <DialogContent>
      {form}
      <br />
    </DialogContent>
  </>
}
