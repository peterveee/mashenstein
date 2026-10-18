import { OBSTACLES } from './entities.js';
import { CRYPT_ZOMBIE_ROLES, cryptZombieRoleInOrder } from '../sprites/crypt-enemies.js';

const ANIMAL_LABELS = {
  goose: 'The Honker', dogSnarler: 'Snarl Barkley',
  rattlesnake: 'The Rattler', bobcat: 'Dust Runner',
  catPythagoras: 'Purr-thagoras', catManeki: 'Lucky Paw', catMechaNeon: 'Mecha-Neko',
  catNekoGhost: 'Ghost Neko', catNeonBright: 'Afterglow', dogFeral: 'Wildfang',
  catFury: 'Whisker Wrath', cryptPanther: 'Violet Vengeance', finishDog: 'Tape Hound',
};

function readableAnimalName(id) {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^(dog|cat)\s+/i, '')
    .replace(/^./, (letter) => letter.toUpperCase());
}

// Keep the gallery in roughly the order players meet the cast: Field Service,
// Speed Zone, Frost Fortress, Crypt Shift, then Terminal Velocity.  This list
// is intentionally explicit so adding a new animal does not silently drop it
// into an arbitrary registry position.
const ANIMAL_ORDER = [
  'goose', 'finishDog', 'dogSnarler',
  'rattlesnake', 'bobcat',
  'snowman',
  'dogFeral', 'cryptPanther', 'catFury',
  'catPythagoras', 'catManeki', 'catMechaNeon', 'catNekoGhost', 'catNeonBright',
];

const animals = ANIMAL_ORDER
  .filter((id) => id !== 'snowman' && OBSTACLES[id]?.animal)
  .map((id) => ({ id, type: id, label: ANIMAL_LABELS[id] || readableAnimalName(id) }));
const animalsById = new Map(animals.map((suspect) => [suspect.id, suspect]));
const selectAnimals = (...ids) => ids.map((id) => animalsById.get(id)).filter(Boolean);

// Snowman sizes are two looks for one suspect. The larger likeness is used on
// its monitor, and either size counts as the first sighting.
export const USUAL_SUSPECTS = [
  ...selectAnimals('goose', 'finishDog', 'dogSnarler'),
  { id: 'beeSwarm', type: 'beeSwarm', label: 'Sting Operation', aliases: ['beeSwarmHigh'] },
  { id: 'scarecrow', type: 'scarecrow', label: 'The Straw Boss' },
  { id: 'saucer', type: 'saucer', label: 'Close Encounter' },
  ...selectAnimals('rattlesnake', 'bobcat'),
  { id: 'snowman', type: 'snowmanBig', label: 'The Cold Shoulder', aliases: ['snowman', 'snowmanBig'] },
  ...selectAnimals('dogFeral', 'cryptPanther', 'catFury'),
  ...CRYPT_ZOMBIE_ROLES.map((role) => ({
    id: `cryptZombie-${role}`, type: 'zombie', role,
    label: ({ usher: 'Last Call', gardener: 'Grave Bloomer', clerk: 'Dead Letter' })[role],
  })),
  ...selectAnimals('catPythagoras', 'catManeki', 'catMechaNeon', 'catNekoGhost', 'catNeonBright'),
];

export function usualSuspectIdForObstacle(ob, cabinetId) {
  if (!ob?.type) return null;
  // The roaming Bruiser and finish-line guard share the finish dog's Bruiser
  // likeness, so they contribute to one Tape Hound entry in the gallery.
  if (ob.type === 'dogBruiser') return 'finishDog';
  if (ob.type === 'beeSwarm' || ob.type === 'beeSwarmHigh') return 'beeSwarm';
  if (ob.type === 'saucer') return 'saucer';
  if (ob.type === 'scarecrow') return 'scarecrow';
  if (ob.def?.animal) return ob.type;
  if (ob.type === 'snowman' || ob.type === 'snowmanBig') return 'snowman';
  if (ob.type === 'zombie' && cabinetId === 'crypt') {
    return `cryptZombie-${cryptZombieRoleInOrder(ob.bobPhase)}`;
  }
  return null;
}
