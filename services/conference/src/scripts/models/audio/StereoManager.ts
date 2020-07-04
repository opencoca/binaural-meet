import {assert} from '@models/utils'
import {NodeGroup} from './NodeGroup'

export class StereoManager {
  private readonly audioContext: AudioContext = new window.AudioContext()
  private readonly audioDestination = this.audioContext.createMediaStreamDestination()

  private readonly audioElement = new Audio()

  nodes: {
    [key: string]: NodeGroup,
  } = {}

  constructor() {
    // For Chrome, resume audio context when loaded (https://goo.gl/7K7WLu)
    // AudioContext must be resumed (or created) after a user gesture on the page.
    const interval = setInterval(
      () => {
        if (this.audioContext.state !== 'suspended') {
          console.log('AudioContext successfully resumed')
          clearInterval(interval)
        }

        this.audioContext.resume()
        this.audioElement.play()  //  play() must be delayed
      },
      1000,
    )

    this.audioElement.srcObject = this.audioDestination.stream
    //  this.audioElement.play()  //  this cause
    //  "StereoManager.ts:30 Uncaught (in promise) DOMException: play() failed
    //  because the user didn't interact with the document first. https://goo.gl/xX8pDD "
  }

  addSpeaker(id: string) {
    assert(this.nodes[id] === undefined)
    this.nodes[id] = new NodeGroup(this.audioContext, this.audioDestination)

    return this.nodes[id]
  }

  removeSpeaker(id: string) {
    console.log('remove speaker')
    this.nodes[id].disconnect()
    delete this.nodes[id]
  }

  setAudioOutput(deviceId:string) {
    const audio: any = this.audioElement
    if (audio.setSinkId) {
      audio.setSinkId(deviceId).then(
        () => { console.log('audio.setSinkId:', deviceId, ' success') },
      ).catch(
        () => { console.log('audio.setSinkId:', deviceId, ' failed') },
      )
    }
  }

  set audioOutputMuted(muted: boolean) {
    this.audioDestination.stream.getTracks().forEach((track) => { track.enabled = !muted })
  }
  get audioOutputMuted():boolean {
    return !(this.audioDestination.stream.getTracks().length > 0
      && this.audioDestination.stream.getTracks()[0].enabled)
  }
}
