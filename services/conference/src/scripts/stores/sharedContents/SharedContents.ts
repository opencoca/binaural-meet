import {TheatersOutlined} from '@material-ui/icons'
import {ParticipantContents as IParticipantContents, SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participantsStore} from '@stores/participants/Participants'
import {diffMap} from '@stores/utils'
import {EventEmitter} from 'events'
import _ from 'lodash'
import {computed, observable} from 'mobx'
import {SharedContent} from './SharedContent'

function contentComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

export function generateSharedContentId(): string {
  if (!participantsStore.localId) {
    throw new Error('addLocalContant() failed. Invalid Participant ID.')

    return ''
  }

  return sharedContents.getUniqueId(participantsStore.localId)
}

export class ParticipantContents implements IParticipantContents {
  constructor(pid: string) {
    this.participantId = pid
  }
  contentIdCounter = 0
  participantId = ''
  @observable.shallow myContents = new Map<string, SharedContent>()
}

export const SharedContentsEvents = {
  REMOTE_JOIN: 'join',
  REMOTE_LEAVE: 'leave',
}
export class SharedContents extends EventEmitter {
  private localId = ''
  //  All shared objects in Z order. Observed by component.
  @observable.shallow all: SharedContent[] = []
  //  contents by owner
  participants: Map<string, ParticipantContents> = new Map<string, ParticipantContents>()
  leavingParticipants: Map<string, ParticipantContents> = new Map<string, ParticipantContents>()

  @observable.shallow updateRequest = new Map<string, SharedContent>()
  @observable.shallow removeRequest = new Set<string>()

  @computed get localParticipant(): ParticipantContents {
    if (!this.localId) { this.localId = participantsStore.localId }
    const p = this.participants.get(this.localId)
    if (!p) {
      const n = new ParticipantContents(this.localId)
      this.participants.set(this.localId, n)
      console.log('Create ParticipantContents for local participant ', this.localId)

      return n
    }
    if (this.localId !== participantsStore.localId) {  //  update local id
      p.participantId = participantsStore.localId
      this.participants.delete(this.localId)
      this.participants.set(p.participantId, p)
      this.localId = p.participantId
      console.log('Set new local id ', p.participantId)
    }

    return p
  }

  //  map from contentId to participantId
  owner: Map <string, string> = new Map<string, string>()

  private updateAll() {
    this.all.length = 0
    this.participants.forEach((participant) => {
      this.all.push(... participant.myContents.values())
    })
    this.all.slice().sort(contentComp)
    //  console.log('update all len=', this.all.length, ' all=', JSON.stringify(this.all))
  }

  //  add
  addLocalContent(content:SharedContent) {
    this.localParticipant.myContents.set(content.id, content)
    this.owner.set(content.id, participantsStore.localId)
    this.updateAll()
  }

  //  replace contents of one participant. A content can be new one (add) or exsiting one (update).
  replaceRemoteContents(pid: string, cs:SharedContent[]) { //  entries = [pid, content][]
    if (pid === participantsStore.localId) {  //  this is for remote participant
      console.log('Error replaceContents called for local participant')

      return
    }
    //  prepare participantContents
    let participant = this.participants.get(pid)
    if (!participant) {
      participant = new ParticipantContents(pid)
      this.participants.set(pid, participant)
      this.emit(SharedContentsEvents.REMOTE_JOIN,  participant)
    }

    const newContents = new Map(cs.map(c => [c.id, c]))
    console.log('replaceContents for participant=', pid, ' n=', newContents.size,
                ' cids:', JSON.stringify(Array.from(newContents.keys())))
    const removed = diffMap(participant.myContents, newContents)

    //  Check remove request and remove it.
    removed.forEach(c => this.removeRequest.delete(c.id))

    //  Check update request and remove request
    newContents.forEach((c) => {
      const updateReq = this.updateRequest.get(c.id)
      if (updateReq && _.isEqual(c, updateReq)) {
        this.updateRequest.delete(c.id)
      }
    })

    //  Check if removal of leaving partitipant is possible or not.
    this.leavingParticipants.forEach((leaving, pid) => {
      console.log('Leave check pid=', pid, ' cids:', JSON.stringify(Array.from(leaving.myContents.keys())))
      const diff = diffMap(newContents, leaving.myContents)
      if (diff.size !== newContents.size) {
        this.leavingParticipants.delete(pid)
        this.removeParticipant(pid)
      }
    })

    //  update contents
    removed.forEach((c) => {
      this.owner.delete(c.id)
    })
    newContents.forEach((c) => { this.owner.set(c.id, pid) })
    participant.myContents = newContents
    this.updateAll()
  }

  //  Update contents. For update requset.
  updateContents(contents: SharedContent[]) {
    contents.forEach((content) => {
      const pid = this.owner.get(content.id)
      if (pid) {
        const participant = this.participants.get(pid)
        console.log('myContents=', JSON.stringify(participant?.myContents))
        console.log('updateContents for participant=', pid, ' ', JSON.stringify(content))

        participant?.myContents.set(content.id, content)
      }else {
        console.log('unpdateContents called for ', content.id, ' with invalid owner pid=', pid)
      }
    })
    this.updateAll()
  }

  //  Remove contents when the content is owned by local participant
  removeContents(pid: string, cids: string[]) {
    const participant = this.participants.get(pid)
    if (participant) {
      // remove them from myContents
      const my = new Map<string, SharedContent>(participant.myContents)
      cids.forEach(cid => my.delete(cid))
      participant.myContents = my
      this.updateAll()
      if (pid !== this.localId) {
        const newRemoveRequest = new Set<string>(this.removeRequest)
        cids.forEach(cid => newRemoveRequest.add(cid))
        this.removeRequest = newRemoveRequest
        console.log('removeContents update remove request', newRemoveRequest)
      }
      console.log('removeContents cids=', cids, ' all=', this.all.length, this.all)
    }else {
      console.log('removeContents failed to find pid=', pid)
    }
  }

  //  If I'm the next, obtain the contents
  onParticipantLeft(pidLeave:string) {
    console.log('onParticipantLeft called with pid = ', pidLeave)
    const participantLeave = this.participants.get(pidLeave)
    if (participantLeave) {
      const allPids = Array.from(participantsStore.remote.keys())
      allPids.push(this.localId)
      allPids.sort()
      const idx = allPids.findIndex(cur => cur > pidLeave)
      const next = allPids[idx >= 0 ? idx : 0]
      console.log('next = ', next)
      if (next === this.localId) {
        console.log('Next is me')
        const myContents = new Map<string, SharedContent>(this.localParticipant.myContents)
        participantLeave.myContents.forEach((c, cid) => {
          myContents.set(cid, c)
          this.owner.set(cid, this.localId)
          console.log('set owner for cid=', cid, ' pid=', this.localId)
        })
        this.removeParticipant(pidLeave)
        console.log('remove:', pidLeave, ' current:', JSON.stringify(allPids))
        console.log('local contents sz:', myContents.size, ' json:', JSON.stringify(Array.from(myContents.keys())))
        this.localParticipant.myContents = myContents
        this.updateAll()
      }else {
        console.log('Next is remote')
        this.leavingParticipants.set(pidLeave, participantLeave)
      }
    }
  }

  private removeParticipant(pid:string) {
    const participant = this.participants.get(pid)
    if (participant) {
      this.emit(SharedContentsEvents.REMOTE_LEAVE,  participant)
      this.participants.delete(pid)
      //  myContents will move to another participant and owner will be overwrite. So, no change on owner.
    }
  }

  getUniqueId(pid: string) {
    if (!this.participants.has(pid)) {
      this.participants.set(pid, new ParticipantContents(pid))
    }
    const participant = this.participants.get(pid)
    if (participant) {
      while (1) {
        participant.contentIdCounter += 1
        const id = `${participant.participantId}_${participant.contentIdCounter}`
        if (!this.owner.has(id)) {
          return id
        }
      }
    }
    console.log('Error in getUniqueId()')

    return ''
  }
}
const sharedContents = new SharedContents()
export default sharedContents
