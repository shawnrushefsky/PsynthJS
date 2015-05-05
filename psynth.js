/**
 * Created by psymac0 on 5/3/15.
 */

if(typeof module !== 'undefined')
{
    var https = require('https');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var $ = {get: function(url, callback)
    {
        //console.log(url);
        https.get(url, function(response){
            var body = '';
            response.on('data', function(d){
                body += d;
            });
            response.on('end', function(){
                //console.log(body);
                callback(body);
            })
        })
    }}
}
/**
 * @namespace {{createGraph, loadGraph, Node, UID, Link, LinkType, Detail}} Psynth
 */
var p = /**
 *
 * @type {{createGraph, loadGraph, Node, UID, Link, LinkType, Detail}}
 */
function(){

    /**
     * This constructor cannot be directly accessed, but instead should be accessed through the {@link Psynth.createGraph} or {@link Psynth.loadGraph} methods.
     * @param {object} params
     * @param {string} params.name - The name of this Graph.
     * @param {string} params.filename - The filename of this Graph. Must be unique to your Psynth server. This is assigned by the server.
     * @param {string} params.username - A Psynth username authorized to access the graph.
     * @param {string} params.password - A password which matches the username.
     * @param {string} params.url - The base URL for your Psynth server. e.g. https://psynth.psymphonic.com/
     * @constructor
     * @memberof Psynth
     * @example
     * var g = new Graph({name: 'My Graph', filename: 'b8e1241a-c90c-46ca-a55e-6cbb9145ab19.gt',
     *                           username: 'myusername', password: 'mypassword', url: 'https://psynth.psymphonic.com'}
     */
    function Graph(params)
    {
        var theGraph = this;

        /**
         * The name of the graph.
         * @type {string}
         */
        this.name = params.name;

        /**
         * The filename of the graph.  Should end in '.gt'
         * @type {string}
         */
        this.filename = params.filename;

        /**
         * The username authorized to access the graph.
         * @type {string}
         */
        this.username = params.username;

        /**
         * The password which matches the username.
         * @type {string}
         */
        this.password = params.password;

        /**
         * The url of your psynth server.  e.g. https://psynth.psymphonic.com/
         * @type {string}
         */
        this.url = params.url;
        var nodes = [];
        var nodeIndex = {};
        var links = [];
        var linkIndex = {};
        var linkTypes = {};
        var details = [];
        var detailIndex = {};
        var queryQueue = [];
        var transit;
        var syncIt = function()
        {

            if(queryQueue.length > 0)
            {
                var q = queryQueue.shift();
                $.get(theGraph.url+'crunch/'+JSON.stringify(idTag(q.query)), function(r){
                    r = JSON.parse(r);
                    if(r !== "invalid")
                    {
                        q.handler(r);
                    }
                    else
                    {
                        console.log(q.query, "failure");
                    }
                    syncIt();
                });
            }
            else
            {
                transit = undefined;
            }

        };
        var idTag = function(obj)
        {
            obj.user = theGraph.username;
            obj.filename = theGraph.filename;
            obj.password = theGraph.password;
            return obj;
        };

        /**
         * All queries should be queued through this function to ensure that they complete in order.  Not doing this can result in links trying to attach to non-existent nodes.
         * @param {object} q - The query to be completed.
         * @param {function} [handler] -Aan optional function to handle the response from the query.
         * @example
         * g.queue({query: 'drawgraph'}, function(response){console.log(response);});
         */
        this.queue = function(q, handler)
        {
            handler = handler || function(r){
                    console.log(q.query+" succeeded.");
                };
            queryQueue.push({query: q, handler: handler});
            //console.log(queryQueue.length+" tasks remaining.");
            if(transit === undefined || transit === null)
            {
                transit = syncIt;
                transit();
            }
        };

        /**
         * This adds a [Node]{@link Psynth.Node} to the graph, and returns the [Node]{@link Psynth.Node}.
         * @param {Psynth.Node|object} node - Can be a [Node]{@link Psynth.Node}, or parameters with which to construct a [Node]{@link Psynth.Node} object.
         * @param {function} [callback] - An optional function to handle the response from the server.
         * @param {boolean} [update=true] - Whether or not to immediately enqueue this task to send to the server.
         * @returns {Psynth.Node}
         * @example
         * function MyFunction(response)
         * {
         *      console.log(response);
         * }
         * var n = g.addNode({name: 'Node 1'}, MyFunction); //n is a Node object
         * console.log(n.name, n.radius);
         */
        this.addNode = function(node, callback, update)
        {
            update = update || true;
            if(node.constructor.name === "Node")
            {
                node.graph = theGraph;
                nodes.push(node);
                nodeIndex[node.uid] = node;
            }
            else
            {
                node = new Node(node);
                node.graph = theGraph;
                nodes.push(node);
                nodeIndex[node.uid] = node;
            }
            if(update)
            {
                var q = node.object();
                q.query = 'newnode';
                theGraph.queue(q, callback);
            }
            return node;
        };

        /**
         * Returns a uid-indexed collection of all [Nodes]{@link Psynth.Node} in the graph.
         * @returns {Object.<string, Psynth.Node>}
         * @example
         * var theNodes = g.nodes();
         * for(var uid in theNodes)
         * {
         *      if(theNodes.hasOwnProperty(uid))
         *      {
         *          var n = theNodes[uid] //n is a Node object.
         *          console.log(n.name, n.radius);
         *      }
         * }
         */
        this.nodes = function()
        {
            return nodeIndex;
        };

        /**
         * Returns an array of all [Nodes]{@link Psynth.Node} in the graph.
         * @returns {Array.<Psynth.Node>}
         * @example
         * var theNodes = g.nodeList();
         * for(var i = 0; i < theNodes.length; i++)
         * {
         *      console.log(theNodes[i].name, theNodes[i].radius);
         * }
         */
        this.nodeList = function()
        {
            return nodes;
        };

        /**
         * Returns a [Node]{@link Psynth.Node} by uid.  Returns -1 if the node does not exist.
         * @param {string} uid
         * @returns {Psynth.Node|number}
         * @example
         * var n = g.node('b8e1241a-c90c-46ca-a55e-6cbb9145ab19');
         * console.log(n.name, n.radius);
         */
        this.node = function(uid)
        {
            if(uid in nodeIndex)
            {
                return nodeIndex[uid];
            }
            else
            {
                return -1;
            }
        };

        /**
         * Removes a [Node]{@link Psynth.Node} from the graph.
         * @param {Psynth.Node} node - The node to remove.
         * @param {function} [callback] - An optional function to handle the server response.
         * @param {boolean} [update=true] - Whether or not to immediately enqueue this task to send to the server.
         * @example
         * var n = g.node('b8e1241a-c90c-46ca-a55e-6cbb9145ab19');
         * function MyFunction(response)
         * {
         *      console.log(response);
         * }
         * g.removeNode(n, MyFunction);
         */
        this.removeNode = function(node, callback, update)
        {
            update = update || true;
            var ind = nodes.indexOf(node);
            nodes.splice(ind, 1);
            delete nodeIndex[node.uid];
            if(update)
            {
                var q = {query: 'delnode', uid: node.uid};
                theGraph.queue(q, callback);
            }
        };

        /**
         * Adds a [Link]{@link Psynth.Link} to the graph, and returns the [Link]{@link Psynth.Link}.
         * @param {Psynth.Link|object} link - Either a [Link]{@link Psynth.Link} object, or the parameters with which to construct one.
         * @param {function} [callback] - An optional function to handle the server response.
         * @param {boolean} [update=true] - Whether or not to immediately enqueue this task to send to the server.
         * @returns {Psynth.Link}
         * @example
         * var linkDef = {origin_uid: 'b8e1241a-c90c-46ca-a55e-6cbb9145ab19',
         *                  terminus_uid: 'a287d501-2ee9-42e3-bfbd-2a41dff6ecda', type: 'Nitrogen', value: 14};
         * function MyFunction(response)
         * {
         *      console.log(response);
         * }
         * var l = g.addLink(linkDef, MyFunction);
         * console.log(l.origin().name, l.terminus().name);
         */
        this.addLink = function(link, callback, update)
        {
            update = update || true;
            if(!(link.origin_uid in nodeIndex))
            {
                throw "Invalid origin node.";
            }
            else if(!(link.terminus_uid in nodeIndex))
            {
                throw "Invalid terminus node.";
            }
            else if(!(link.type in linkTypes))
            {
                throw "Invalid LinkType.";
            }
            else
            {
                if(link.constructor.name === "Link")
                {
                    link.graph = theGraph;
                    links.push(link);
                    linkIndex[link.uid] = link;
                }
                else
                {
                    link = new Link(link);
                    link.graph = theGraph;
                    links.push(link);
                    linkIndex[link.uid] = link;
                }
                if(update)
                {
                    var q = link.object();
                    q.query = 'newrel';
                    theGraph.queue(q, callback);
                }
                return link;

            }
        };

        /**
         * Returns a uid-indexed collection of all [Links]{@link Psynth.Link} in the Graph.
         * @returns {Object.<string, Psynth.Link>}
         * @example
         * var theLinks = g.links();
         * for(var uid in theLinks)
         * {
         *      if(theLinks.hasOwnProperty(uid))
         *      {
     *              var l = theLinks[uid];
     *              console.log(l.name, l.origin().name);
         *      }
         * }
         */
        this.links = function()
        {
            return linkIndex;
        };

        /**
         * Returns an array of all [Links]{@link Psynth.Link} in the Graph.
         * @returns {Array.<Psynth.Link>}
         * @example
         * var theLinks = g.linkList();
         * for(var i = 0; i < theLinks.length; i++)
         * {
         *      console.log(theLinks[i].origin().name, theLinks[i].terminus().name);
         * }
         */
        this.linkList = function()
        {
            return links;
        };

        /**
         * Returns a [Link]{@link Psynth.Link} by uid. Returns -1 if the [Link]{@link Psynth.Link} does not exist.
         * @param {string} uid
         * @returns {Psynth.Link|number}
         * @example
         * var l = g.link('a287d501-2ee9-42e3-bfbd-2a41dff6ecda');
         * console.log(l.name, l.type);
         */
        this.link = function(uid)
        {
            if(uid in linkIndex)
            {
                return linkIndex[uid];
            }
            else
            {
                return -1;
            }
        };

        /**
         * Removes a [Link]{@link Psynth.Link} from the Graph.
         * @param {Psynth.Link} link - The [Link]{@link Psynth.Link} to remove.
         * @param {function} [callback] - An optional function to handle the server response.
         * @param {boolean} [update=true] - Whether or not to immediately enqueue this task to send to the server.
         * @example
         * var l = g.link('a287d501-2ee9-42e3-bfbd-2a41dff6ecda');
         * function MyFunction(response)
         * {
         *      console.log(response);
         * }
         * g.removeLink(l, MyFunction);
         */
        this.removeLink = function(link, callback, update)
        {
            update = update || true;
            var ind = links.indexOf(link);
            links.splice(ind, 1);
            delete linkIndex[link.uid];
            if(update)
            {
                var q = {query: 'delrel', uid: link.uid};
                theGraph.queue(q, callback);
            }
        };

        /**
         * Adds a [LinkType]{@link Psynth.LinkType} to the Graph, and returns it.
         * @param {Psynth.LinkType} linktype - The [LinkType]{@link Psynth.LinkType} object to add.
         * @param {function} [callback] - An optional function to handle the server response.
         * @param {boolean} [update=true] - Whether or not to immediate enqueue this task to send to the server.
         * @returns {Psynth.LinkType}
         * @example
         * function MyFunction(response)
         * {
         *      console.log(response);
         * }
         * var lt = g.addLinkType(new Psynth.LinkType(), MyFunction)
         * console.log(lt.name, lt.color);
         */
        this.addLinkType = function(linktype, callback, update)
        {
            update = update || true;
            linktype.graph = theGraph;
            linkTypes[linktype.name] = linktype;
            if(update)
            {
                var q = linktype.object();
                q.query = "newreltype";
                theGraph.queue(q, callback);
            }
            return linktype;
        };

        /**
         * Returns a name-indexed collection of [LinkTypes.]{@link Psynth.LinkType}
         * @returns {Object.<string, Psynth.LinkType>}
         * @example
         * var lt = g.linkTypes();
         * for(var name in lt)
         * {
         *      if(lt.hasOwnProperty(name))
         *      {
         *          console.log(lt[name].color);
         *      }
         * }
         */
        this.linkTypes = function()
        {
            return linkTypes;
        };

        /**
         * Returns a [LinkType]{@link Psynth.LinkType} by name. Returns -1 if the [LinkType]{@link Psynth.LinkType} does not exist.
         * @param {string} name
         * @returns {Psynth.LinkType|number}
         * @example
         * var lt = g.linkType('Nitrogen');
         * console.log(lt.color, lt.max);
         */
        this.linkType = function(name)
        {
            if(name in linkTypes)
            {
                return linkTypes[name];
            }
            else
            {
                return -1;
            }
        };

        /**
         * Adds a [Detail]{@link Psynth.Detail} object to the graph and returns it.
         * @param {Psynth.Detail|Object} detail - Either a [Detail]{@link Psynth.Detail} object, or the parameters with which to construct one.
         * @param {function} [callback] - An optional function to handle the server response.
         * @param {boolean} [update=true] - Whether or not to immediately enqueue the task to send to the server.
         * @returns {Psynth.Detail}
         * @example
         * var dDef = {
         *              anchor_uid: 'ec918bb1-7463-427f-919f-26fbe3760b6a',
         *              anchor_type: 'Node',
         *              type: 'link',
         *              x: g.node('ec918bb1-7463-427f-919f-26fbe3760b6a').x+50,
         *              y: g.node('ec918bb1-7463-427f-919f-26fbe3760b6a').y+50,
         *              content: 'http://psymphonic.com'
         *            };
         * function MyFunction(response)
         * {
         *      console.log(response);
         * }
         * var d = g.addDetail(dDef, MyFunction);
         * console.log(d.anchor().name, d.content);
         */
        this.addDetail = function(detail, callback, update)
        {
            update = update || true;
            if(detail.anchor_type === "Node" &&!(detail.anchor_uid in nodeIndex))
            {
                throw "Invalid anchor Node."
            }
            else if(detail.anchor_type === "Link" &&!(detail.anchor_uid in linkIndex))
            {
                throw "Invalid anchor Link."
            }
            else
            {
                if(detail.constructor.name === "Detail")
                {
                    detail.graph = theGraph;
                    details.push(detail);
                    detailIndex[detail.uid] = detail;
                }
                else
                {
                    detail = new Detail(detail);
                    detail.graph = theGraph;
                    details.push(detail);
                    detailIndex[detail.uid] = detail;
                }
                if(update)
                {
                    var q = detail.object();
                    q.query = "newdetail";
                    theGraph.queue(q, callback);
                }
                return detail;
            }

        };

        /**
         * Returns a uid-indexed collection of all [Details]{@link Psynth.Detail} in the Graph.
         * @returns {Object.<string, Psynth.Detail>}
         * @example
         * var theDetails = g.details();
         * for(var uid in theDetails)
         * {
         *      if(theDetails.hasOwnProperty(uid))
         *      {
         *          console.log(theDetails[uid].content);
         *      }
         * }
         */
        this.details = function()
        {
            return detailIndex;
        };

        /**
         * Returns an array of all [Details]{@link Psynth.Detail} in the Graph.
         * @returns {Array.<Psynth.Detail>}
         * @example
         * var theDetails = g.detailList();
         * for(var i = 0; i < theDetails.length; i++)
         * {
         *      console.log(theDetails[i].anchor().name, theDetails[i].anchor_type);
         * }
         */
        this.detailList = function()
        {
            return details;
        };

        /**
         * Returns a [Detail]{@link Psynth.Detail} by uid. Returns -1 if the [Detail]{@link Psynth.Detail} does not exist.
         * @param {string} uid
         * @returns {Psynth.Detail|number}
         * @example
         * var d = g.detail('d5976550-551c-4489-a777-b8e839c75515');
         * console.log(d.type, d.content);
         */
        this.detail = function(uid)
        {
            if(uid in detailIndex)
            {
                return detailIndex[uid];
            }
            else
            {
                return -1;
            }
        };

        /**
         * Removes a [Detail]{@link Psynth.Detail} from the graph.
         * @param {Psynth.Detail} detail - The [Detail]{@link Psynth.Detail} to remove.
         * @param {function} [callback] - An optional function to handle the server response.
         * @param {boolean} [update] - Whether or not to immediately enqueue the task to send to the server.
         * @example
         * function MyFunction(response)
         * {
         *      console.log(response);
         * }
         * g.removeDetail(g.detail('d5976550-551c-4489-a777-b8e839c75515'), MyFunction);
         */
        this.removeDetail = function(detail, callback, update)
        {
            update = update || true;
            var ind = details.indexOf(detail);
            details.splice(ind, 1);
            delete detailIndex[detail.uid];
            if(update)
            {
                var q = {query: 'deldetail', uid: detail.uid};
                theGraph.queue(q, callback);
            }

        };

        /**
         * Calculates a layout for the graph, and updates all [Node]{@link Psynth.Node} and [Detail]{@link Psynth.Detail} positions.
         * @param {function} [callback] - An optional function to handle the server response.
         * @example
         * function MyFunction(response)
         * {
         *      console.log(response);
         * }
         * g.draw(MyFunction);
         */
        this.draw = function(callback)
        {
            callback = callback || function(r){};
            var updatePos = function(r)
            {
                for (var i = 0; i < r.nodes.length; i++) {
                    nodeIndex[r.nodes[i].UID].x = r.nodes[i].X;
                    nodeIndex[r.nodes[i].UID].y = r.nodes[i].Y;
                }
                for (var i = 0; i < r.details.length; i++) {
                    detailIndex[r.details[i].UID].x = r.details[i].X;
                    detailIndex[r.details[i].UID].y = r.details[i].Y;
                }
            };
            var handler = function(r)
            {
                updatePos(r);
                callback(r);
            };
            theGraph.queue({query: 'drawgraph'}, handler);
        };

        /**
         * Creates a publicly accessible version of the Graph. Logs the URL where it can be found.  It's important to do this after the final draw command is issued.
         * @param {function} [callback] - An optional function to handle the server response.
         * @example
         * g.draw(function(){
         *      g.publish();
         * }
         */
        this.publish = function(callback)
        {
            //console.log(callback);
            callback = callback || function(r){};
            var handler = function(r)
            {
                console.log("Graph published at "+theGraph.url+'p/ublic/'+decodeURIComponent(r));
                callback(r);
            };
            var x = theGraph.minX()+.1;
            var y = theGraph.minY()+.1;

            var q = {query: 'publish', x: x, y: y, scale: 1080/theGraph.height()};

            theGraph.queue(q, handler);
        };

        /**
         * Finds the lowest x-value of any [Node]{@link Psynth.Node} in the Graph.
         * @returns {number}
         * @example
         * console.log(g.minX());
         */
        this.minX = function()
        {
            var min;
            for(var uid in nodeIndex)
            {
                if(nodeIndex.hasOwnProperty(uid))
                {
                    if(min === undefined || nodeIndex[uid].x < min)
                    {
                        min = nodeIndex[uid].x;
                    }
                }
            }
            return min;
        };

        /**
         * Finds the highest x-value of any [Node]{@link Psynth.Node} in the Graph.
         * @returns {number}
         * @example
         * console.log(g.maxX());
         */
        this.maxX = function()
        {
            var max;
            for(var uid in nodeIndex)
            {
                if(nodeIndex.hasOwnProperty(uid))
                {
                    if(max === undefined || nodeIndex[uid].x > max)
                    {
                        max = nodeIndex[uid].x;
                    }
                }
            }
            return max;
        };

        /**
         * Finds the lowest y-value of any [Node]{@link Psynth.Node} in the Graph.
         * @returns {number}
         * @example
         * console.log(g.minY());
         */
        this.minY = function()
        {
            var min;
            for(var uid in nodeIndex)
            {
                if(nodeIndex.hasOwnProperty(uid))
                {
                    if(min === undefined || nodeIndex[uid].y < min)
                    {
                        min = nodeIndex[uid].y;
                    }
                }

            }
            return min;
        };

        /**
         * Finds the highest y-value of any [Node]{@link Psynth.Node} in the Graph.
         * @returns {number}
         * @example
         * console.log(g.maxY());
         */
        this.maxY = function()
        {
            var max;
            for(var uid in nodeIndex)
            {
                if(nodeIndex.hasOwnProperty(uid))
                {
                    if(max === undefined || nodeIndex[uid].y > max)
                    {
                        max = nodeIndex[uid].y;
                    }
                }
            }
            return max;
        };

        /**
         * Returns the width of the Graph.
         * @returns {number}
         * @example
         * console.log(g.width());
         */
        this.width = function()
        {
            return theGraph.maxX() - theGraph.minX();
        };

        /**
         * Returns the height of the Graph.
         * @returns {number}
         * @example
         * console.log(g.height());
         */
        this.height = function()
        {
            return theGraph.maxY() - theGraph.minY();
        };
    }

    /**
     * Creates a Node Object.  While this constructor can be accessed directly, it's easier to use it through {@link Psynth.Graph#addNode}.
     * A Node must be added to a [Graph]{@link Psynth.Graph} to be functional.
     * @param {object} params
     * @param {string} [params.name=Node] - The name of the Node.
     * @param {number} [params.x=1] - The x-coordinate of the Node.
     * @param {number} [params.y=1] - the y-coordinate of the Node.
     * @param {number|string} [params.shape=6] - The shape of the Node. 0 for circle, 1 for image, otherwise the number
     *                                           of sides. Can also be 'circle','triangle','square','pentagon','hexagon','septagon','octagon'
     * @param {number} [params.radius=24] - The radius of the Node, in Pixels.
     * @param {string} [params.color='default'] - A color string (e.g. #FFFFFF).  'default' will cause the node to color itself responsively with the user selected palette.
     * @param {string} [params.image='default'] - A url for an image to display on the Node.  Requires a shape of 1.
     * @param {string} [params.uid] - Defaults to global unique id.
     * @constructor
     * @memberof Psynth
     * @example <caption>Adding a node in two steps.</caption>
     * var n = new Psynth.Node({radius: 48, shape: 3});
     * g.addNode(n);
     * console.log(n.name, n.color);
     * @example <caption>A more convenient 1-liner</caption>
     * var n = g.addNode({radius: 48, shape: 3});
     * console.log(n.name, n.color);
     */
    function Node(params)
    {
        var me = this;
        if(params.name === undefined || params.name === "default")
        {
            params.name = "Node"
        }
        else
        {
            params.name = decodeURIComponent(params.name);
        }

        if(params.x === undefined || params.x === "default")
        {
            params.x = 1;
        }
        else
        {
            params.x = Number(params.x);
        }

        if(params.y === undefined || params.y === "default")
        {
            params.y = 1;
        }
        else
        {
            params.y = Number(params.y);
        }

        if(params.shape === undefined || params.shape === "default")
        {
            params.shape = 6;
        }
        else if(params.shape === "circle")
        {
            params.shape = 0;
        }
        else if(params.shape === "triangle")
        {
            params.shape = 3;
        }
        else if(params.shape === "square" || params.shape === "diamond")
        {
            params.shape = 4;
        }
        else if(params.shape === "pentagon" || params.shape === "pent")
        {
            params.shape = 5;
        }
        else if(params.shape === "hexagon" || params.shape === "hex")
        {
            params.shape = 6;
        }
        else if(params.shape === "septagon" || params.shape === "sept")
        {
            params.shape = 7;
        }
        else if(params.shape === "octagon" || params.shape === "oct")
        {
            params.shape = 8;
        }
        else
        {
            params.shape = Number(params.shape);
        }

        if(params.radius === undefined || params.radius === "default")
        {
            params.radius = 24;
        }
        else
        {
            params.radius = Number(params.radius);
        }

        if(params.color === undefined || params.color === "default")
        {
            params.color = 'default';
        }
        else
        {
            params.color = decodeURIComponent(params.color);
        }


        if(params.uid === undefined || params.uid === "default")
        {
            params.uid = p().UID();
        }
        else
        {
            params.uid = decodeURIComponent(params.uid);
        }

        if(params.image === undefined || params.image === 'default')
        {
            params.image = 'default';
        }
        else
        {
            params.image = decodeURIComponent(params.image);
        }

        /**
         * The name of the Node.
         * @type {string}
         */
        this.name = params.name;

        /**
         * The x-coordinate of the Node, in Pixels.  Assumes web-standard grid with (0,0) at (top,left)
         * @type {number}
         */
        this.x = params.x;

        /**
         * The y-coordinate of the Node, in Pixels.  Assumes web-standard grid with (0,0) at (top,left)
         * @type {number}
         */
        this.y = params.y;

        /**
         * The radius of the Node, in Pixels.
         * @type {number}
         */
        this.radius = params.radius;

        /**
         * The shape of the Node, in number of sides. 0 for circle, 1 for image. 3+ for n-gon.  Although shapes can be instantiated with strings at Node construction, they are stored as numbers for internal use.
         * @type {number}
         */
        this.shape = params.shape;

        /**
         * The color of the node.  'default' will make the node responsive to user palette selection.  Otherwise should be in the form of "#FFFFFF"
         * @type {string}
         */
        this.color = params.color;

        /**
         * A URL for an image to display on the Node.  Requires a shape of 1 to display.
         * @type {string}
         */
        this.image = params.image;

        /**
         * A unique identifier for this Node.  This is what the node is indexed by at {@link Graph#nodes}.
         * @type {string}
         */
        this.uid = params.uid;

        /**
         * This is the [Graph]{@link Psynth.Graph} to which this Node belongs.
         * @type {Psynth.Graph}
         */
        this.graph;

        /**
         * Attaches a [Detail]{@link Psynth.Detail} to this Node, and returns it.
         * @param {Psynth.Detail|object} detail - Either a [Detail]{@link Psynth.Detail} object, or parameters for the constuction of one.
         * @returns {Psynth.Detail}
         * @example
         * var d = n.addDetail({content: 'http://psymphonic.com', type: 'link'});
         * console.log(d.anchor_uid === n.uid)
         * //true
         */
        this.addDetail = function(detail)
        {
            detail.anchor_type = me.type;
            detail.anchor_uid = me.uid;
            if(detail.x === undefined)
            {
                detail.x = me.x+me.radius+4;
            }
            if(detail.y === undefined)
            {
                var num = 0;
                var dets = me.graph.detailList();
                for(var i = 0; i < dets.length; i++)
                {
                    if(dets[i].anchor_uid === me.anchor_uid)
                    {
                        num++;
                    }
                }
                detail.y = me.y+me.radius+(20*num);
            }
            return me.graph.addDetail(detail);
        };

        /**
         * Returns a uid-indexed collection of [Details]{@link Psynth.Detail} which are anchored to this Node.
         * @returns {Object.<string, Psynth.Detail>}
         * @example
         * var dets = n.details();
         * for(var uid in dets)
         * {
         *      if(dets.hasOwnProperty(uid))
         *      {
         *          console.log(dets[uid].content);
         *      }
         * }
         */
        this.details = function()
        {
            var detsGlobal = me.graph.detailList();
            var myDets = {};
            for(var i = 0; i < detsGlobal.length; i++)
            {
                if(detsGlobal[i].anchor_type === me.type && detsGlobal[i].anchor_uid === me.uid)
                {
                    myDets[detsGlobal[i].uid] = detsGlobal[i]
                }
            }
            return myDets;
        };

        /**
         * Returns an array of [Details]{@link Psynth.Detail} which are anchored to this Node.
         * @returns {Array.<Psynth.Detail>}
         * @example
         * var dets = n.detailList();
         * for(var i = 0; i < dets.length; i++)
         * {
         *      console.log(dets[i].content);
         * }
         */
        this.detailList = function()
        {
            var detsGlobal = me.graph.detailList();
            var myDets = [];
            for(var i = 0; i < detsGlobal.length; i++)
            {
                if(detsGlobal[i].anchor_type === me.type && detsGlobal[i].anchor_uid === me.uid)
                {
                    myDets.push(detsGlobal[i])
                }
            }
            return myDets;
        };

        /**
         * Returns an array of [Links]{@link Psynth.Link} which originate at this Node.
         * @returns {Array.<Psynth.Link>}
         * @example
         * var links = n.outLinks();
         * for(var i = 0; i < links.length; i++)
         * {
         *      console.log(links[i].type, links[i].value);
         * }
         */
        this.outLinks = function()
        {
            var ls = [];
            var linksGlobal = me.graph.linkList();
            for(var i = 0; i < linksGlobal.length; i++)
            {
                if(linksGlobal[i].origin_uid === me.uid)
                {
                    ls.push(linksGlobal[i]);
                }
            }
            return ls;
        };

        /**
         * Returns an array of [Links]{@link Psynth.Link} which terminate at this Node.
         * @returns {Array.<Psynth.Link>}
         * @example
         * var links = n.inLinks();
         * for(var i = 0; i < links.length; i++)
         * {
         *      console.log(links[i].type, links[i].value);
         * }
         */
        this.inLinks = function()
        {
            var ls = [];
            var linksGlobal = me.graph.linkList();
            for(var i = 0; i < linksGlobal.length; i++)
            {
                if(linksGlobal[i].terminus_uid === me.uid)
                {
                    ls.push(linksGlobal[i]);
                }
            }
            return ls;
        };

        /**
         * Returns an array of [Links]{@link Psynth.Link} which are connected to this Node.
         * @returns {Array.<Psynth.Link>}
         * @example
         * var links = n.allLinks();
         * for(var i = 0; i < links.length; i++)
         * {
         *      console.log(links[i].type, links[i].value);
         * }
         */
        this.allLinks = function()
        {
            var ls = [];
            var linksGlobal = me.graph.linkList();
            for(var i = 0; i < linksGlobal.length; i++)
            {
                if(linksGlobal[i].terminus_uid === me.uid || linksGlobal[i].origin_uid === me.uid)
                {
                    ls.push(linksGlobal[i]);
                }
            }
            return ls;
        };

        /**
         * Returns an array of [Nodes]{@link Psynth.Node} which are neighbors of this node, by outgoing [Links]{@link Psynth.Link}
         * @returns {Array.<Psynth.Node>}
         * @example
         * var nodes = n.outNeighbors();
         * for(var i = 0; i < nodes.length; i++)
         * {
         *      console.log(nodes[i].name, nodes[i].color);
         * }
         */
        this.outNeighbors = function()
        {
            var ns = [];
            var linksGlobal = me.graph.linkList();
            for(var i = 0; i < linksGlobal.length; i++)
            {
                if(linksGlobal[i].origin_uid === me.uid)
                {
                    ns.push(me.graph.nodes()[linksGlobal[i].terminus_uid]);
                }
            }
            return ns;
        };

        /**
         * Returns an array of [Nodes]{@link Psynth.Node} which are neighbors of this node, by incoming [Links]{@link Psynth.Link}
         * @returns {Array.<Psynth.Node>}
         * @example
         * var nodes = n.inNeighbors();
         * for(var i = 0; i < nodes.length; i++)
         * {
         *      console.log(nodes[i].name, nodes[i].color);
         * }
         */
        this.inNeighbors = function()
        {
            var ns = [];
            var linksGlobal = me.graph.linkList();
            for(var i = 0; i < linksGlobal.length; i++)
            {
                if(linksGlobal[i].terminus_uid === me.uid)
                {
                    ns.push(me.graph.nodes()[linksGlobal[i].origin_uid]);
                }
            }
            return ns;
        };

        /**
         * Returns an array of [Nodes]{@link Psynth.Node} which are neighbors of this node.
         * @returns {Array.<Psynth.Node>}
         * var nodes = n.allNeighbors();
         * for(var i = 0; i < nodes.length; i++)
         * {
         *      console.log(nodes[i].name, nodes[i].color);
         * }
         */
        this.allNeighbors = function()
        {
            var ns = [];
            var linksGlobal = me.graph.linkList();
            for(var i = 0; i < linksGlobal.length; i++)
            {
                if(linksGlobal[i].terminus_uid === me.uid)
                {
                    ns.push(me.graph.nodes()[linksGlobal[i].origin_uid]);
                }
                else if(linksGlobal[i].origin_uid === me.uid)
                {
                    ns.push(me.graph.nodes()[linksGlobal[i].terminus_uid]);
                }
            }
            return ns;
        };

        /**
         * @typedef simpleNode
         * @type {object}
         * @property {string} uid
         * @property {string} name
         * @property {number} x
         * @property {number} y
         * @property {number} radius
         * @property {string} shape
         * @property {string} picture
         * @property {string} color
         */
        /**
         * Formats the node as a JSON-serializable object which contains all necessary information.  This is mostly used internally to prepare queries for the server.
         * @returns {simpleNode}
         * @example
         * var q = n.object();
         * q.query = "newnode";
         * g.queue(q);
         */
        this.object = function()
        {
            return {name: encodeURIComponent(me.name), uid: me.uid, x: me.x, y: me.y, shape: ''+me.shape, picture: encodeURIComponent(me.image), radius: me.radius, color: encodeURIComponent(me.color)};

        };

        /**
         * Updates the information for this Node on the server.  This allows you to make multiple edits to a node while only making 1 server call.
         * @param {function} [callback]
         * @example
         * n.name = "different name";
         * n.x += 5;
         * n.radius +=6;
         * n.update();
         */
        this.update = function(callback)
        {
            var q = me.object();
            q.query = "updatenode";
            me.graph.queue(q, callback);
        }
    }

    /**
     * Creates a Link Object.  Although this constructor can be accessed directly, it's easier to use it through {@link Psynth.Graph#addLink).
     * A Link must be added to a [Graph]{@link Psynth.Graph} before it is fully functional.
     * @param {object} params
     * @param {string} [params.name] - The name of the Link.
     * @param {string} params.type - The {@link LinkType#name} of this Link.
     * @param {number} [params.value=1] - The value of this Link.
     * @param {string} [params.uid] - A unique identifier for this link. Defaults to a global unique id.
     * @param {string} params.origin_uid - The {@link Node#uid} for the origin Node of this Link.
     * @param {string} params.terminus_uid - The {@link Node#uid} for the terminus Node of this Link.
     * @constructor
     * @memberof Psynth
     * @example <caption>Using the constructor directly</caption>
     * var lt = g.addLinkType(new Psynth.LinkType());
     * var l = new Psynth.Link({origin_uid: n1.uid, terminus_uid: n2.uid, type: lt.name, value: 2});
     * g.addLink(l);
     * console.log(l.origin().name, l.terminus().name);
     * @example <caption>A better 1-liner.</caption>
     * var lt = g.addLinkType(new Psynth.LinkType());
     * var l = g.addLink({origin_uid: n1.uid, terminus_uid: n2.uid, type: lt.name, value: 2});
     * console.log(l.origin().name, l.terminus().name);
     *
     */
    function Link(params)
    {
        var me = this;
        if(params.name === undefined || params.name === 'default')
        {
            params.name = params.type
        }
        else
        {
            params.name = decodeURIComponent(params.name);
        }
        if(params.value === undefined || params.value === 'default')
        {
            params.value = 1;
        }
        else
        {
            params.value = Number(params.value);
        }
        if(params.uid === undefined || params.uid === 'default')
        {
            params.uid = p().UID();
        }
        else
        {
            params.uid = decodeURIComponent(params.uid);
        }

        /**
         * The name of this Link.
         * @type {string}
         */
        this.name = params.name;

        /**
         * The {@link LinkType#name} of this Link.
         * @type {string}
         */
        this.type = params.type;

        /**
         * The value of this Link.
         * @type {number}
         */
        this.value = params.value;

        /**
         * The {@link Node#uid} of the Origin Node.
         * @type {string}
         */
        this.origin_uid = params.origin_uid;

        /**
         * The {@link Node#uid} of the Terminus Node.
         * @type {string}
         */
        this.terminus_uid = params.terminus_uid;

        /**
         * A unique identifier for this Link. This is what is indexed for {@link Graph#links}.
         * @type {string}
         */
        this.uid = params.uid;

        /**
         * This is the Graph to which this Link belongs.
         * @type {Psynth.Graph}
         */
        this.graph;

        /**
         * Attaches a [Detail]{@link Psynth.Detail} to this Link, and returns it.
         * @param detail
         * @return {Psynth.Detail}
         * @example
         * var d = l.addDetail({content: 'http://psymphonic.com', type: 'link'});
         * console.log(d.anchor_uid === l.uid)
         * //true
         */
        this.addDetail = function(detail)
        {
            detail.anchor_type = me.type;
            detail.anchor_uid = me.uid;
            if(detail.x === undefined)
            {
                detail.x = me.x+me.radius+4;
            }
            if(detail.y === undefined)
            {
                var num = 0;
                var dets = me.graph.detailList();
                for(var i = 0; i < dets.length; i++)
                {
                    if(dets[i].anchor_uid === me.anchor_uid)
                    {
                        num++;
                    }
                }
                detail.y = me.y+me.radius+(20*num);
            }
            return me.graph.addDetail(detail);
        };

        /**
         * Returns a uid-indexed collection of [Details]{@link Psynth.Detail} which are anchored to this Link.
         * @returns {Object.<string, Psynth.Detail>}
         * @example
         * var dets = l.details();
         * for(var uid in dets)
         * {
         *      if(dets.hasOwnProperty(uid))
         *      {
         *          console.log(dets[uid].content);
         *      }
         * }
         */
        this.details = function()
        {
            var detsGlobal = me.graph.detailList();
            var myDets = {};
            for(var i = 0; i < detsGlobal.length; i++)
            {
                if(detsGlobal[i].anchor_type === me.type && detsGlobal[i].anchor_uid === me.uid)
                {
                    myDets[detsGlobal[i].uid] = detsGlobal[i]
                }
            }
            return myDets;
        };

        /**
         * Returns an array of [Details]{@link Psynth.Detail} which are anchored to this Link.
         * @returns {Array.<Psynth.Detail>}
         * @example
         * var dets = l.detailList();
         * for(var i = 0; i < dets.length; i++)
         * {
         *      console.log(dets[i].content);
         * }
         */
        this.detailList = function()
        {
            var detsGlobal = me.graph.detailList();
            var myDets = [];
            for(var i = 0; i < detsGlobal.length; i++)
            {
                if(detsGlobal[i].anchor_type === me.type && detsGlobal[i].anchor_uid === me.uid)
                {
                    myDets.push(detsGlobal[i])
                }
            }
            return myDets;
        };

        /**
         * Returns an array of [Links]{@link Psynth.Link} which are parallel to this one, including this one.
         * @returns {Array.<Psynth.Link>}
         * @example
         * var p = l.parallel();
         * for(var i = 0; i < p.length; i++)
         * {
         *      console.log(p[i].value, p[i].type);
         * }
         */
        this.parallel = function()
        {
            var linksGlobal = me.graph.linkList();
            var ls = [];
            for(var i = 0; i < linksGlobal.length; i++)
            {
                if((linksGlobal[i].origin_uid === me.origin_uid && linksGlobal[i].terminus_uid === me.terminus_uid)
                    ||(linksGlobal[i].origin_uid === me.terminus_uid && linksGlobal[i].terminus_uid === me.origin_uid))
                {
                    ls.push(linksGlobal[i]);
                }
            }
            return ls;
        };

        /**
         * Returns the Origin [Node]{@link Psynth.Node}, or -1 if the Node is invalid.
         * @returns {Psynth.Node|number}
         * @example
         * console.log(l.origin().name);
         */
        this.origin = function()
        {
            return me.graph.node(me.origin_uid);
        };

        /**
         * Returns the Termins [Node]{@link Psynth.Node}, or -1 if the Node is invalid.
         * @returns {Psynth.Node|number}
         * @example
         * console.log(l.terminus().name);
         */
        this.terminus = function()
        {
            return me.graph.node(me.terminus_uid);
        };

        /**
         * @typedef simpleLink
         * @type {object}
         * @property {string} uid
         * @property {string} name
         * @property {number} value
         * @property {string} rel_type
         * @property {string} o_uid
         * @property {string} t_uid
         */
        /**
         * Formats the Link as a JSON-serializable object which contains all necessary information.  This is mostly used internally to prepare queries for the server.
         * @returns {simpleLink}
         * @example
         * var q = l.object();
         * q.query = "newrel";
         * g.queue(q);
         */
        this.object = function()
        {
            return {uid: me.uid, name: encodeURIComponent(me.name), value: me.value, rel_type: me.type, o_uid: me.origin_uid, t_uid: me.terminus_uid};
        };

        /**
         * Updates the information for this Link on the server.  This allows you to make multiple edits to a Link while only making 1 server call.
         * @param {function} [callback] - An optional function to handle the server response.
         * @example
         * l.name = "Best Friends";
         * l.value = 8;
         * l.update();
         */
        this.update = function(callback)
        {
            var q = me.object();
            q.query = "updaterel";
            me.graph.queue(q, callback);
        };
    }

    /**
     * Creates a LinkType object, which defines parameters for Links.  It's easier to do this through {@link Psynth.Graph#addLinkType}.
     * A LinkType must be added to a [Graph]{@link Psynth.Graph} before [Links]{@link Psynth.Link} can be created of that type.
     * @param params
     * @param {string} [params.name='Links'] - The name of this LinkType.  Should be unique to this Graph.
     * @param {string} [params.icon='img/link_icon.png'] - A URL for an image to display as an icon for this LinkType. Should be 24x21 pixels, with a transparent background.
     * @param {string} [params.tile='img/link_tile.png'] - A URL for an image to display on the tiling sprite for this LinkType. Should be 100x21 pixels, with a transparent background.
     * @param {string} [params.color='#1aa2d4'] - The color for this LinkType. Should be a string such as "#FFFFFF"
     * @param {number} [params.max=10] - The maximum value any Link of this LinkType can have.  Must be >= 1.
     * @constructor
     * @memberof Psynth
     * @example <caption>Using the constructor directly</caption>
     * var lt = new Psynth.LinkType({name: 'Positive',
     *                               max: 10,
     *                               icon: 'img/pos_icon.png',
     *                               tile: 'img/pos_tile.png',
     *                               color: '#1aa2d4'});
     * g.addLinkType(lt);
     * @example <caption>A better way</caption>
     * var lt = g.addLinkType({name: 'Positive',
     *                         max: 10,
     *                         icon: 'img/pos_icon.png',
     *                         tile: 'img/pos_tile.png',
     *                         color: '#1aa2d4'});
     */
    function LinkType(params)
    {
        var me = this;
        params = params || {};
        if(params.name === undefined || params.name === "default")
        {
            params.name = "Links";
        }
        else
        {
            params.name = decodeURIComponent(params.name);
        }
        if(params.icon === undefined || params.icon === "default")
        {
            params.icon = "img/link_icon.png";
        }
        else
        {
            params.icon = decodeURIComponent(params.icon);
        }
        if(params.tile === undefined || params.tile === "default")
        {
            params.tile = "img/link_tile.png";
        }
        else
        {
            params.tile = decodeURIComponent(params.tile);
        }
        if(params.max === undefined || params.max === "default")
        {
            params.max = 10;
        }
        else
        {
            params.max = Number(params.max);
        }
        if(params.color === undefined || params.color === "default")
        {
            params.color = '#1aa2d4';
        }
        else
        {
            params.color = decodeURIComponent(params.color);
        }

        /**
         * The name of this LinkType. Should be unique to this Graph.
         * @type {string}
         * @default 'Links'
         */
        this.name = params.name;

        /**
         * A URL for an image to display as an icon for this LinkType. Should be 24x21 pixels, with a transparent background.
         * @type {string}
         * @default 'img/link_icon.png'
         */
        this.icon = params.icon;

        /**
         * A URL for an image to display on the tiling sprite for this LinkType. Should be 100x21 pixels, with a transparent background.
         * @type {string}
         * @default 'img/link_tile.png'
         */
        this.tile = params.tile;

        /**
         * The maximum value for a [Link]{@link Psynth.Link} of this LinkType.
         * @type {number}
         * @default 10
         */
        this.max = params.max;

        /**
         * The color of this LinkType. Should be a string like "#FFFFFF"
         * @type {string}
         * @default '#1aa2d4'
         */
        this.color = params.color;

        /**
         * The graph to which this LinkType belongs.
         * @type {Psynth.Graph}
         */
        this.graph;

        /**
         * @typedef simpleLinkType
         * @type {object}
         * @property {string} NAME
         * @property {string} ICON
         * @property {string} TILE
         * @property {string} COLOR
         * @property {number} MAX
         */
        /**
         * Formats the LinkType as a JSON-serializable object which contains all necessary information.  This is mostly used internally to prepare queries for the server.
         * @returns {simpleLinkType}
         * @example
         * var q = lt.object();
         * q.query = "newreltype";
         * g.queue(q);
         */
        this.object = function()
        {
            return {NAME: encodeURIComponent(me.name), ICON: encodeURIComponent(me.icon), TILE: encodeURIComponent(me.tile), MAX: me.max, COLOR: encodeURIComponent(me.color)};
        };

        /**
         * Updates the information for this LinkType on the server.  This allows you to make multiple edits to a LinkType while only making 1 server call.
         * @param {function} [callback] - An optional function to handle the server response.
         * @example
         * lt.name = "Pos";
         * lt.max = 45;
         * lt.update();
         */
        this.update = function(callback)
        {
            callback = callback || function(r){};
            var handler = function(r)
            {
                var relsGlobal = me.graph.linkList();
                for(var i = 0; i < relsGlobal.length; i++)
                {
                    if(relsGlobal[i].type === r.rel_type.O_NAME)
                    {
                        relsGlobal[i].value = r.rels[relsGlobal[i].uid];
                        relsGlobal[i].type = r.rel_type.NAME;
                    }
                }
                callback(r);
            };
            var q = this.object();
            q.query = "updatereltype";
            me.graph.queue(q, handler);
        }
    }

    /**
     * Creates a Detail object.  Although this constructor can be used directly, it's better to use it from {@link Psynth.Node#addDetail} or {@link Psynth.Link#addDetail}.
     * By using these methods, the Detail gets its anchor_uid and anchor_type automatically. It is also automatically added to the [Graph]{@link Psynth.Graph}.
     * Additionally, there are useful defaults for the x and y properties that can only be accessed by adding a detail directly to the object.
     * @param {object} params
     * @param {string} [params.type=comment] - The type of Detail this is. Can be 'comment','link','video','image'.
     * @param {string} [params.name] - The name of this Detail. This is not currently used for anything on the front end.
     * @param {string} [params.uid] - A unique identifier for this Detail. Defaults to a global unique id.
     * @param {string} params.anchor_uid - The uid for the object this Detail is anchored to.
     * @param {string} params.anchor_type - The type of object this Detail is anchored to. Currently supported are 'Link' and 'Node'
     * @param {string} params.content - The content of this Detail.
     * @param {number} params.x - The x-coordinate of this Detail in Pixels. Assumes web-standard grid with (0,0) at (top,left).
     * @param {number} params.y - The y-coordinate of this Detail in Pixels. Assumes web-standard grid with (0,0) at (top,left).
     * @constructor
     * @memberof Psynth
     * @example <caption>Direct use of Constructor</caption>
     * var d = new Psynth.Detail({anchor_uid: n.uid,
     *                            anchor_type: 'Node',
     *                            x: n.x+n.radius+10,
     *                            y: n.y+n.radius+30,
     *                            type: 'link',
     *                            content: 'http://psymphonic.com'});
     * g.addDetail(d);
     * @example <caption>Adding to an existing object</caption>
     * var d = n.addDetail({content: 'http://psymphonic.com', type: 'link'});
     */
    function Detail(params)
    {
        var me = this;
        if(params.type === undefined || params.type === "default")
        {
            params.type = "comment";
        }
        else
        {
            params.type = decodeURIComponent(params.type);
        }
        if(params.name === undefined || params.name === "default")
        {
            params.name = params.type
        }
        else
        {
            params.name = decodeURIComponent(params.name);
        }
        if(params.uid === undefined || params.uid === "default")
        {
            params.uid = p().UID();
        }
        else
        {
            params.uid = decodeURIComponent(params.uid);
        }
        params.anchor_uid = decodeURIComponent(params.anchor_uid);
        params.anchor_type = decodeURIComponent(params.anchor_type);
        params.content = decodeURIComponent(params.content);

        /**
         * The name of this Detail. Not currently used for anything on the front end.
         * @type {string}
         */
        this.name = params.name;

        /**
         * The type of Detail this. 'comment', 'link', 'image', 'video'
         * @type {string}
         * @default 'comment'
         */
        this.type = params.type;

        /**
         * The uid of the object this Detail is anchored to.
         * @type {string}
         */
        this.anchor_uid = params.anchor_uid;

        /**
         * The type of object this Detail is anchored to. 'Node', 'Link'
         * @type {string}
         */
        this.anchor_type = params.anchor_type;

        /**
         * A unique identifier for this Detail.  This is what is indexed at {@link Graph#details}, {@link Node#details}, and {@link Link#details}
         * @type {string}
         */
        this.uid = params.uid;

        /**
         * The content of this Detail.
         * @type {string}
         */
        this.content = params.content;

        /**
         * The x-coordinate of this Detail in Pixels. Assumes web-standard grid with (0,0) at (top,left).
         * @type {number}
         */
        this.x = Number(params.x);

        /**
         * The y-coordinate of this Detail in Pixels. Assumes web-standard grid with (0,0) at (top,left).
         * @type {number}
         */
        this.y = Number(params.y);

        /**
         * The [Graph]{@link Psynth.Graph} to which this Detail belongs.
         * @type {Psynth.Graph}
         */
        this.graph;

        /**
         * Returns the [Node]{@link Psynth.Node} or [Link]{@link Psynth.Link} that this Detail is anchored to. Returns -1 if the anchor is invalid.
         * @returns {Psynth.Node|Psynth.Link|Number}
         * @example
         * console.log(d.anchor().name);
         */
        this.anchor = function()
        {
            if(me.anchor_type === "Node")
            {
                return me.graph.node(me.anchor_uid);
            }
            else if(me.anchor_type === "Link")
            {
                return me.graph.link(me.anchor_uid);
            }
        };

        /**
         * @typedef simpleDetail
         * @type {object}
         * @property {string} anchor_uid
         * @property {string} anchor_type
         * @property {string} uid
         * @property {string} name
         * @property {string} content
         * @property {string} type
         * @property {number} x
         * @property {number} y
         */
        /**
         * Formats the Detail as a JSON-serializable object which contains all necessary information.  This is mostly used internally to prepare queries for the server.
         * @returns {simpleDetail} object
         * @example
         * var q = d.object();
         * q.query = "newdetail";
         * g.queue(q);
         */
        this.object = function()
        {
            return {anchor_uid: me.anchor_uid, anchor_type: me.anchor_type, uid: me.uid, name: encodeURIComponent(me.name), content: encodeURIComponent(me.content), type: me.type, x: me.x, y: me.y};
        };

        /**
         * Updates the information for this Detail on the server.  This allows you to make multiple edits to a Link while only making 1 server call.
         * @param {function} [callback] - An optional function to handle the server response.
         * @example
         * d.content = "www.opensecrets.org";
         * d.y += 20;
         * d.update();
         */
        this.update = function(callback)
        {
            var q = me.object();
            q.query = "updatedetail";
            me.graph.queue(q, callback);
        };
    }

    return {

        /**
         * Creates a new [Graph]{@link Psynth.Graph}, and returns it to a callback function.
         * @param {object} params
         * @param {string} params.url - The base URL for your Psynth server. e.g. https://psynth.psymphonic.com/
         * @param {string} params.username - Your Psynth username.
         * @param {string} params.password - Your Psynth password.
         * @param {string} params.name - The name of the the new Graph.
         * @param {function} handler - A callback function that will receive the Graph when it is returned from the server.
         * @memberof Psynth
         * @example
         * var graphParameters = {name: 'test map',username: 'myusername',
         *                        password: 'mypassword', url: 'https://psynth.psymphonic.com/'};
         * function MyFunction(graph){
         *      //your code
         * }
         * Psynth.createGraph(graphParameters, MyFunction);
         */
        createGraph: function(params, handler)
        {
            var g = new Graph(params);
            var q = {query: 'createmap', user: g.username, password: g.password, name: g.name};
            $.get(g.url + 'p/'+JSON.stringify(q), function(r){
                r = JSON.parse(r);
                g.filename = r.filename;
                handler(g);
            })
        },

        /**
         * Loads a [Graph]{@link Psynth.Graph} by filename, and returns it to a callback function.
         * @param params
         * @param {string} params.url - The base URL for your Psynth server. e.g. https://psynth.psymphonic.com/
         * @param {string} params.username - Your Psynth username.
         * @param {string} params.password - Your Psynth password.
         * @param {string} params.filename - The filename of the the Graph to load.
         * @param {function} handler - A callback function that will receive the Graph when it is returned from the server.
         * @memberof Psynth
         * @example
         * var graphParameters = {filename: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.gt',username: 'myusername',
         *                        password: 'mypassword', url: 'https://psynth.psymphonic.com/'};
         * function MyFunction(graph){
         *      //your code
         * }
         * Psynth.loadGraph(graphParameters, MyFunction);
         */
        loadGraph: function(params, handler)
        {
            var g = new Graph(params);
            $.get(g.url+'crunch/'+JSON.stringify({query: 'getwholegraph', filename: g.filename, user: g.username, password: g.password}), function(e)
            {
                e = JSON.parse(e);
                if(e !== undefined)
                {
                    g.name = e.name;
                    for(var i = 0; i < e.rel_types.length; i++)
                    {
                        g.addLinkType(new LinkType({
                            name: e.rel_types[i].NAME,
                            max: e.rel_types[i].MAX,
                            icon: e.rel_types[i].ICON,
                            tile: e.rel_types[i].TILE,
                            color: e.rel_types[i].COLOR
                        }))
                    }
                    for(var i = 0; i < e.nodes.length; i++)
                    {
                        g.addNode({
                            name: e.nodes[i].NAME,
                            x: e.nodes[i].X,
                            y: e.nodes[i].Y,
                            shape: e.nodes[i].SHAPE,
                            radius: e.nodes[i].RADIUS,
                            color: e.nodes[i].COLOR,
                            image: e.nodes[i].PICTURE,
                            uid: e.nodes[i].UID
                        });
                    }
                    for(var i = 0; i < e.rels.length; i++)
                    {
                        g.addLink({
                            name: e.rels[i].NAME,
                            type: e.rels[i].TYPE,
                            value: e.rels[i].VALUE,
                            origin_uid: e.rels[i].ORIGIN,
                            terminus_uid: e.rels[i].TERMINUS,
                            uid: e.rels[i].UID
                        });
                    }
                    for(var i = 0; i < e.details.length; i++)
                    {
                        g.addDetail({
                            name: e.details[i].NAME,
                            type: e.details[i].TYPE,
                            anchor_uid: e.details[i].ANCHOR_UID,
                            anchor_type: e.details[i].ANCHOR_TYPE,
                            content: e.details[i].CONTENT,
                            uid: e.details[i].UID,
                            x: e.details[i].X,
                            y: e.details[i].Y
                        });
                    }
                    handler(g);
                }
            })
        },

        Node: function(params)
        {
            return new Node(params);
        },

        /**
         * Returns a global unique identifier of format 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
         * @memberof Psynth
         * @returns {string}
         * @example
         * var uid = p().UID();
         * //uid === 'b8e1241a-c90c-46ca-a55e-6cbb9145ab19'
         */
        UID: function(){
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16)
            });
        },

        Link: function(params)
        {
            return new Link(params);
        },

        LinkType: function(params)
        {
            return new LinkType(params);
        },

        Detail: function(params)
        {
            return new Detail(params);
        }
    };

};

if(typeof module === 'undefined')
{
    console.log('window mode');
    window.Psynth = p();
}
else if(typeof module !== 'undefined' && module.exports)
{
    console.log('node mode');
    module.exports = p();
}
