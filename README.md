# Edge-Path Bundling
Javascript implementation of the edge-path bundling algorithm.

The algorithm can be seen in action here: https://mwallinger-tu.github.io/edge-path-bundling/

## Abstract

Edge bundling techniques cluster edges with similar attributes (i.e. similarity in direction and proximity) together to reduce the visual clutter. All edge bundling techniques to date implicitly or explicitly cluster groups of individual edges, or parts of them, together based on these attributes. These clusters can result in ambiguous connections that do not exist in the data. Confluent drawings of networks do not have these ambiguities, but require the layout to be computed as part of the bundling process. We devise a new bundling method, Edge-Path bundling, to simplify edge clutter while greatly reducing ambiguities compared to previous bundling techniques. Edge-Path bundling takes a layout as input and clusters each edge along a weighted, shortest path to limit its deviation from a straight line. Edge-Path bundling does not incur independent edge ambiguities typically seen in all edge bundling methods, and the level of bundling can be tuned through shortest path distances, Euclidean distances, and combinations of the two. Also, directed edge bundling naturally emerges from the model. Through metric evaluations, we demonstrate the advantages of Edge-Path bundling over other techniques.

DOI: 10.1109/TVCG.2021.3114795

https://arxiv.org/abs/2108.05467



##