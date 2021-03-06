import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import {Tooltip} from '@material-ui/core'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {strcmp} from '@models/utils'
import {MapData} from '@stores/Map'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {getRandomColor} from '@stores/utils'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {contentTypeIcons} from '../map/ShareLayer/Content'
import {styleForList} from '../utils/styles'

const height = 20
const fontSize = 16

export const ContentLine: React.FC<{participant: ParticipantBase, content: ISharedContent, map: MapData}> = (props) => {
  const contentName = useObserver(() => props.content.name)
  const name = useObserver(() => props.content.ownerName)
  const colors = getRandomColor(name)
  const contentType = useObserver(() => props.content.type)
  const classes = styleForList({height, fontSize})
  const typeIcon = contentTypeIcons(contentType, fontSize)

  return <Tooltip title={name} placement="right">
    <div className={classes.line} style={{backgroundColor:colors[0], color:colors[1]}}
      onClick={() => props.map.focusOn(props.content)}>
        {typeIcon}{contentName}
    </div>
  </Tooltip>
}


export const ContentList: React.FC = () => {
  const participants = useParticipantsStore()
  const contents = useContentsStore()
  const map = useMapStore()
  const all = useObserver(() => {
    const array = Array.from(contents.all)
    const filtered = array.filter((c) => {
      const owner = contents.owner.get(c?.id)
      if (owner) {
        if (participants.find(owner)) {
          return true
        }
      }

      return false
    })
    const sorted = array.sort((a, b) => {
      let rv = strcmp(a.type, b.type)
      if (rv === 0) {
        rv = strcmp(a.name, b.name)
      }

      return rv
    })

    /* sort by distance
    const dists = new Map<string, number>()
    for (const c of sorted) {
      const v = subV2(c.pose.position, participants.local.pose.position)
      const d = v[0] * v[0] + v[1] * v[1]
      dists.set(c.id, d)
    }
    sorted.sort((a, b) => {
      const da = dists.get(a.id) as number
      const db = dists.get(b.id) as number

      return da - db
    })
    */

    return sorted
  })

  const classes = styleForList({height, fontSize})

  const elements = all.map(c =>
    <ContentLine key={c.id} content = {c} map={map}
      participant={participants.find(contents.owner.get(c.id) as string) as ParticipantBase} />)

  return (
    <div className={classes.container} >
      <div className={classes.title}>Contents</div>
      {elements}
    </div>
  )
}
ContentList.displayName = 'ContentList'
