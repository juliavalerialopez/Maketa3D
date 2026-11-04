import Sofa from './Sofa'
import CoffeeTable from './CoffeeTable'
import Armchair from './Armchair'
import Bookshelf from './Bookshelf'
import FloorLamp from './FloorLamp'
import TvStand from './TvStand'

// The 3D model component of each type in catalog.js, by the same key (I.4).
// Only the scene draws models, so only scene/Objects.jsx imports this.
export const OBJECT_MODELS = {
  sofa: Sofa,
  coffeeTable: CoffeeTable,
  armchair: Armchair,
  bookshelf: Bookshelf,
  floorLamp: FloorLamp,
  tvStand: TvStand,
}
