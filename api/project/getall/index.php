 <?php

$opts = array(
	'http' => array(
			'method' => 'GET'
	)
);

$context = stream_context_create($opts);
$file = file_get_contents('http://smartnotes.krikz.com/api/project/getall/', false, $context);
echo $file;

?>