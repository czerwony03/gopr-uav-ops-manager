class DocumentReference {
  constructor(id) {
    this.id = id;
  }
}

class CollectionReference {
  constructor(path) {
    this.path = path;
  }
}

class QuerySnapshot {
  constructor(docs = []) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
  
  forEach(callback) {
    this.docs.forEach(callback);
  }
}

const Timestamp = {
  now: () => ({ toDate: () => new Date() }),
  fromDate: (date) => ({ toDate: () => date }),
};

const FieldValue = {
  serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
  arrayUnion: (...elements) => ({ _methodName: 'arrayUnion', _elements: elements }),
  arrayRemove: (...elements) => ({ _methodName: 'arrayRemove', _elements: elements }),
};

const where = jest.fn();
const orderBy = jest.fn();
const limit = jest.fn();
const query = jest.fn();
const getDocs = jest.fn();
const getDoc = jest.fn();
const addDoc = jest.fn();
const setDoc = jest.fn();
const updateDoc = jest.fn();
const deleteDoc = jest.fn();
const collection = jest.fn();
const doc = jest.fn();

module.exports = {
  DocumentReference,
  CollectionReference,
  QuerySnapshot,
  Timestamp,
  FieldValue,
  where,
  orderBy,
  limit,
  query,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  doc,
};