<?php


	// $opts = array(
		// 'http'=>array(
			// 'method'=>'GET',
			// 'header'=>'Content-Type: text/html; charset=utf-8',
			// 'Accept'=>'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			// 'Accept-Encoding'=>'gzip,deflate,sdch',
			// 'Accept-Language'=>'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
			// 'Cache-Control'=>'no-cache',
			// 'Host'=>'smartnotes.krikz.com',
			// 'Pragma'=>'no-cache',
			// 'Proxy-Connection'=>'keep-alive',
			// 'User-Agent'=>'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.36',
		// )
	// );

	// $context = stream_context_create($opts);

	// $contents = file_get_contents('http://smartnotes.krikz.com/api/project/getall', false, $context);
	// file_put_contents('./test.txt', $page);
	// echo $contents;

	readfile('http://smartnotes.krikz.com/api/project/getall');

?>