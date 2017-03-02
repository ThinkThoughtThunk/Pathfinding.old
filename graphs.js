'use strict'

// toEdgeId :: Vertex -> Vertex -> String
const toEdgeId = (source, destination) => `Edge_${source.id}to${destination.id}`
// toVertexId :: Vertex -> String
const toVertexId = (vertex) => `Vertex_${vertex.position.x}x${vertex.position.y}`

// Vertex :: String -> { x, y } -> Bool? -> Vertex
function Vertex(id, position, active = true) {
	this.id = id
	this.position = {
		x: position.x,
		y: position.y
	}
	this.active = active
}
Vertex.prototype.equals = function(object) {
	if (this == object) return true
	if (!object) return false
	return this.id === object.id
}
Vertex.prototype.toString = function() {
	return this.id
}

// Edge :: String -> Vertex -> Vertex -> Int -> Edge
function Edge(id, source, destination, weight) {
	this.id = id
	this.source = source
	this.destination = destination
	this.weight = weight
}
Edge.prototype.toString = function() {
	return this.source + " to " + this.destination
}

// Graph :: Map (String, Vertex) -> Map (String, Edge) -> Graph
function Graph(vertices, edges) {
	this.vertices = vertices
	this.edges = edges
}

// type alias djikstra = { calculatePathsFrom, getPath }
// djikstra :: Graph -> djikstra
function djikstra(graph) {
	const {
		vertices,
		edges
	} = graph

	const visited = []
	const unvisited = []
	const distances = {}
	const predecessors = {}

	// Public
	// Take a source vertex and mutate the "djikstra graph" obj where
	// all vertices have a shortest path
	// calculatePathsFrom :: Vertex -> djikstra object
	const calculatePathsFrom = (source) => {
		distances[source.id] = 0
		unvisited.push(source)

		while (unvisited.length > 0) {
			let vertex = lowestCostVertexFrom(unvisited)
			visited.push(vertex)
			// remove it from unvisted
			unvisited.splice(unvisited.findIndex(element => element.id == vertex.id), 1)
			// Populate the distances for the rest of the potential destinations
			findAllDistancesFrom(vertex)
		}
	}

	// Public, finds the shortest path to a destination given that the
	// "djikstra graph" object has already calculated paths through the .calculatePathsFrom method
	// getPath :: Vertex -> [Vertex]
	const getPath = (destination) => {
		const path = []
		let step = destination
		if (!predecessors[step.id])
			return null
		path.push(step)
		while (predecessors[step.id]) {
			step = predecessors[step.id]
			path.push(step)
		}
		return path.reverse()
	}

	// Private, takes a source and mutates local graph variables to give
	// shortest paths to any other destination
	// findAllDistancesFrom :: Vertex -> undefined
	const findAllDistancesFrom = (source) => {
		const friends = neighborsOf(source)
		for (let i in friends) {
			let destination = friends[i]
			let distanceThroughThisVertex = shortestDistanceTo(source) +
				distanceBetween(source, destination)

			if (shortestDistanceTo(destination) > distanceThroughThisVertex) {
				distances[destination.id] = distanceThroughThisVertex
				predecessors[destination.id] = source
				unvisited.push(destination)
			}
		}
	}

	// Private, gives the weight of the edge between two vertices
	// edges :: Map (String, [Edge])
	// distanceBetween :: Vertex -> Vertex -> Int
	const distanceBetween = (source, destination) => {
		let edgeList = edges[source.id]
		for (let i in edgeList) {
			let edge = edgeList[i]

			if (edge.source.equals(source) && edge.destination.equals(destination)) {
				return edge.weight
			}
		}
		throw new Error("Called distanceBetween with unconnected vertices")
	}

	// Private, takes a vertex and returns all of the adjacent vertices that
	// still need to have their distances calculated
	// neighborsOf :: Vertex -> [Vertex]
	const neighborsOf = (vertex) => {
		const neighbors = []
		let edgeList = edges[vertex.id]
		for (let i in edgeList) {
			let edge = edgeList[i]

			if (edge.source.equals(vertex) && !alreadySeen(edge.destination)) {
				neighbors.push(edge.destination)
			}
		}
		return neighbors
	}

	// Private, method for getting vertex with shortest path
	// (this takes the place of using a priority queue, at the expense of O(V) search)
	// lowestCostVertexFrom :: Map (String, Vertex) -> Vertex
	const lowestCostVertexFrom = (vertices) => {
		let minimum
		for (let i in vertices) {
			let vertex = vertices[i]
			if (minimum === undefined) {
				minimum = vertex
			} else {
				if (shortestDistanceTo(vertex) < shortestDistanceTo(minimum)) {
					minimum = vertex
				}
			}
		}
		return minimum
	}

	// Private
	// alreadySeen :: Vertex -> Bool
	const alreadySeen = (vertex) => visited.includes(vertex)

	// Private
	// shortestDistanceTo :: Vertex -> Int
	const shortestDistanceTo = (destination) => {
		const distance = distances[destination.id]
		if (distance == null) return Infinity
		return distance
	}

	//
	// Return an object representing the djikstra graph
	return {
		calculatePathsFrom: calculatePathsFrom,
		getPath: getPath
	}
}


// createVertices :: Int -> Int -> Map (String, Vertex)
function createVertices(width, height) {
	let vertices = {}
	for (let row = 0; row < height; row++) {
		for (let column = 0; column < width; column++) {
			let id = `Vertex_${column}x${row}`
			let vertex = new Vertex(id, {
				x: column,
				y: row
			})
			vertices[id] = vertex
		}
	}
	return vertices
}

// makeEdge :: Vertex -> Vertex -> Int -> Edge
const makeEdge = (source, destination, weight) => {
	return new Edge(toEdgeId(source, destination),
		vertices[toVertexId(source)],
		vertices[toVertexId(destination)],
		weight)
}

// Adjacency list edges
// createEdges :: Map (String, Vertex) -> Map (String, [Edge])
function createEdges(vertices) {
	let edgeMap = {}
	let edgeList = []
	for (let i in vertices) {
		let vertex = vertices[i]
		let neighbors = neighborsOf(vertex)

		for (let j in neighbors) {
			let neighbor = neighbors[j]
			// Diagonals have weight sqrt(2), otherwise weight is 1
			let edge = makeEdge(vertex, neighbor.cell, neighbor.diagonal ? Math.sqrt(2) : 1)
			if (!edgeMap[vertex.id])
				edgeMap[vertex.id] = []
			edgeMap[vertex.id].push(edge)
		}
	}
	return edgeMap
}

// neighborsOf :: Vertex -> [Vertex]
function neighborsOf(vertex) {
	const {
		id,
		position
	} = vertex

	// getCell :: Int -> Int -> Either undefined Vertex
	// Access 'vertices' from surrounding scope
	function getCell(x, y) {
		let id = `Vertex_${x}x${y}`
		return vertices[id]
	}

	// surroundings :: Vertex -> [Vertex]
	// Accesses 'vertices' from surrounding scope
	function surroundings(vertex) {
		const {
			position
		} = vertex
		const {
			x,
			y
		} = position

		return [
			// up:
			{
				cell: getCell(x, y - 1),
				diagonal: false
			},
			// upRight:
			{
				cell: getCell(x + 1, y - 1),
				diagonal: false
			},
			// right:
			{
				cell: getCell(x + 1, y),
				diagonal: false
			},
			// downRight:
			{
				cell: getCell(x + 1, y + 1),
				diagonal: true
			},
			// down:
			{
				cell: getCell(x, y + 1),
				diagonal: false
			},
			// downLeft:
			{
				cell: getCell(x - 1, y + 1),
				diagonal: true
			},
			// left:
			{
				cell: getCell(x - 1, y),
				diagonal: false
			},
			// upLeft:
			{
				cell: getCell(x - 1, y - 1),
				diagonal: true
			}
		]
	}

	return surroundings(vertex).filter(vertex => vertex.cell !== undefined)
}

// createDomNodes :: Dom Elt -> Int -> Int -> Map (String, Dom elt)
function createDomNodes(container, width, height) {
	let nodes = {}
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let node = document.createElement("div")
			node.className = "node "
			node.className += "active "
			node.position = {
				x: x,
				y: y
			}
			node.id = `Vertex_${x}x${y}`
			node.addEventListener('contextmenu', setStartOrFinish)
			node.addEventListener('click', toggleWall)

			container.appendChild(node)
			nodes[node.id] = node
		}
	}
	return nodes
}



// Mutates vertex and edges
// The idea is that when we add a wall, we remove all edges where the destination
// is the newly added wall node
// When we remove a wall, we add an edge to all neighboring vertices where the
// destination is the node with the wall removed
// toggleWall :: undefined
function toggleWall(e) {
	const node = e.currentTarget,
		id = node.id,
		vertex = vertices[id],
		{
			active
		} = vertex

	// Wall is 'down'
	if (active) {
		vertex.active = false
		node.className += "wall "
		// Remove edges from adjacent nodes
		let neighbors = neighborsOf(vertex)
		for (let i in neighbors) {
			let neighbor = neighbors[i]
			let edgeList = edges[neighbor.cell.id]
			for (let j in edgeList) {
				let edge = edgeList[j]
				// How would we make this immutable?
				// Can we keep a reference to the edges somehow so we don't have to delete?
				if (edge.destination.equals(vertex)) {
					delete edges[neighbor.cell.id][j]
				}
			}
		}
	}
	// Wall is 'up'
	else {
		vertex.active = true
		node.className = "node active "
		// Add edges from adjacent nodes to this vertex
		let neighbors = neighborsOf(vertex)
		for (let i in neighbors) {
			let neighbor = neighbors[i]
			let edge = makeEdge(neighbor.cell, vertex, neighbor.diagonal ? Math.sqrt(2) : 1)
			edges[neighbor.cell.id].push(edge)
		}
	}
}

// Could merge setStart and setFinish... but eh
// setStart :: Int -> Int -> Vertex?
function setStart(x, y, oldStart = null) {
	// Remove "start" class
	if (oldStart) {
		let id = toVertexId(oldStart)
		document.querySelector('#' + id).className = "node "
	}
	let id = `Vertex_${x}x${y}`

	// Update appearance of node
	document.querySelector('#' + id).className += "start "

	return graph.vertices[id]
}

// setFinish :: Int -> Int -> Vertex?
function setFinish(x, y, oldFinish = null) {
	// Remove "finish" class
	if (oldFinish) {
		let id = toVertexId(oldFinish)
		document.querySelector('#' + id).className = "node "
	}
	let id = `Vertex_${x}x${y}`

	// Set new finish
	document.querySelector('#' + id).className += "finish "

	// Return an object representing the start position
	return graph.vertices[id]
}

// Mutates start or finish objects
// setStartOrFinish :: event -> undefined
const setStartOrFinish = ((e) => {
	// Using a closure to maintain lastSet state variable
	let lastSet = 'finish'
	return (e) => {
		e.preventDefault()
		let id = e.currentTarget.id
		let position = vertices[id].position

		if (lastSet == 'finish') {
			start = setStart(position.x, position.y, start)
			lastSet = 'start'
		} else {
			finish = setFinish(position.x, position.y, finish)
			lastSet = 'finish'
		}
	}
})()
