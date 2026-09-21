SELECT
  `racktables`.`Object`.`id` AS `id`,
  `racktables`.`Object`.`name` AS `name`,
  `racktables`.`Object`.`label` AS `label`,
  `racktables`.`Object`.`objtype_id` AS `objtype_id`,
  `racktables`.`Object`.`asset_no` AS `asset_no`,
  `racktables`.`Object`.`has_problems` AS `has_problems`,
  `racktables`.`Object`.`comment` AS `comment`
FROM
  `racktables`.`Object`
WHERE
  `racktables`.`Object`.`objtype_id` NOT IN (1560, 1561, 1562)