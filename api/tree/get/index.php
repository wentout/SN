 <?php

$opts = array(
	'http' => array(
			'method' => 'GET'
	)
);

$context = stream_context_create($opts);

$url = 'http://smartnotes.krikz.com/api/note/getbranch/';
if(isset($_POST['id'])){
	$url .= '?id='.$_POST['id'];
}

$file = file_get_contents($url, false, $context);
echo $file;

?>